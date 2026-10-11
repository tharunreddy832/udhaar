package com.udhaar.backend.service;

import com.udhaar.backend.dto.CandidateCustomerDto;
import com.udhaar.backend.dto.ReconciliationMatchResponse;
import com.udhaar.backend.entity.*;
import com.udhaar.backend.entity.enums.MatchType;
import com.udhaar.backend.entity.enums.VerificationStatus;
import com.udhaar.backend.exception.ResourceNotFoundException;
import com.udhaar.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReconciliationService {

    private final ReconciliationMatchRepository reconciliationMatchRepository;
    private final CustomerRepository customerRepository;
    private final CustomerAliasRepository customerAliasRepository;
    private final CreditEntryRepository creditEntryRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ReconciliationMatchResponse> getReviewQueue() {
        User currentUser = getCurrentAuthenticatedUser();
        List<ReconciliationMatch> pendingMatches = reconciliationMatchRepository
                .findAllByUserIdAndVerificationStatus(currentUser.getId(), VerificationStatus.NEEDS_REVIEW);

        return pendingMatches.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public List<ReconciliationMatchResponse> runReconciliation(Long customerId) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(customerId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));

        List<CreditEntry> credits = creditEntryRepository.findAllByCustomerIdOrderByEntryDateDesc(customerId);
        List<Payment> payments = paymentRepository.findAllByCustomerIdOrderByPaymentDateDesc(customerId);

        List<ReconciliationMatch> createdOrActiveMatches = new ArrayList<>();

        for (Payment payment : payments) {
            BigDecimal paymentMatchedSoFar = reconciliationMatchRepository.sumMatchedAmountByPaymentId(payment.getId());
            BigDecimal paymentRemaining = payment.getAmount().subtract(paymentMatchedSoFar);

            if (paymentRemaining.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            for (CreditEntry credit : credits) {
                if (paymentRemaining.compareTo(BigDecimal.ZERO) <= 0) break;

                BigDecimal creditMatchedSoFar = reconciliationMatchRepository.sumMatchedAmountByCreditEntryId(credit.getId());
                BigDecimal creditRemaining = credit.getAmount().subtract(creditMatchedSoFar);

                if (creditRemaining.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                // Check if active match already exists
                Optional<ReconciliationMatch> existing = reconciliationMatchRepository.findActiveMatch(credit.getId(), payment.getId());
                if (existing.isPresent()) {
                    createdOrActiveMatches.add(existing.get());
                    continue;
                }

                // Calculate allocation
                BigDecimal matchAmount = paymentRemaining.min(creditRemaining);
                double confidence = 0.75;
                List<String> reasons = new ArrayList<>();

                if (payment.getAmount().compareTo(credit.getAmount()) == 0) {
                    confidence = 0.95;
                    reasons.add("Exact transaction amount match (₹" + matchAmount + ")");
                } else if (matchAmount.compareTo(creditRemaining) == 0) {
                    confidence = 0.85;
                    reasons.add("Payment covers remaining credit balance (₹" + matchAmount + ")");
                } else {
                    confidence = 0.75;
                    reasons.add("Partial payment allocation of ₹" + matchAmount + " towards credit entry of ₹" + credit.getAmount());
                }

                // Check date proximity
                if (payment.getPaymentDate() != null && credit.getEntryDate() != null) {
                    long daysDiff = ChronoUnit.DAYS.between(credit.getEntryDate(), payment.getPaymentDate());
                    if (daysDiff >= 0 && daysDiff <= 15) {
                        confidence = Math.min(1.0, confidence + 0.05);
                        reasons.add("Payment occurred within " + daysDiff + " days of credit entry");
                    }
                }

                ReconciliationMatch newMatch = ReconciliationMatch.builder()
                        .creditEntry(credit)
                        .payment(payment)
                        .matchedAmount(matchAmount)
                        .confidence(BigDecimal.valueOf(confidence))
                        .matchType(MatchType.AI)
                        .verificationStatus(VerificationStatus.NEEDS_REVIEW)
                        .reason(String.join(". ", reasons))
                        .build();

                newMatch = reconciliationMatchRepository.save(newMatch);
                createdOrActiveMatches.add(newMatch);

                paymentRemaining = paymentRemaining.subtract(matchAmount);
            }
        }

        return createdOrActiveMatches.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public ReconciliationMatchResponse verifyMatch(Long matchId) {
        User currentUser = getCurrentAuthenticatedUser();
        ReconciliationMatch match = reconciliationMatchRepository.findByIdAndUserId(matchId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Reconciliation match not found: " + matchId));

        if (match.getVerificationStatus() == VerificationStatus.VERIFIED) {
            return mapToResponse(match);
        }

        match.setVerificationStatus(VerificationStatus.VERIFIED);
        ReconciliationMatch saved = reconciliationMatchRepository.save(match);
        return mapToResponse(saved);
    }

    @Transactional
    public ReconciliationMatchResponse rejectMatch(Long matchId) {
        User currentUser = getCurrentAuthenticatedUser();
        ReconciliationMatch match = reconciliationMatchRepository.findByIdAndUserId(matchId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Reconciliation match not found: " + matchId));

        match.setVerificationStatus(VerificationStatus.REJECTED);
        ReconciliationMatch saved = reconciliationMatchRepository.save(match);
        return mapToResponse(saved);
    }

    @Transactional
    public ReconciliationMatchResponse reassignMatchCustomer(Long matchId, Long newCustomerId) {
        User currentUser = getCurrentAuthenticatedUser();
        ReconciliationMatch match = reconciliationMatchRepository.findByIdAndUserId(matchId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Reconciliation match not found: " + matchId));

        Customer newCustomer = customerRepository.findByIdAndUserId(newCustomerId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Target customer not found: " + newCustomerId));

        // Find best open credit entry for the new customer
        List<CreditEntry> credits = creditEntryRepository.findAllByCustomerIdOrderByEntryDateDesc(newCustomerId);
        if (!credits.isEmpty()) {
            // Find credit entry with closest amount or first available
            CreditEntry targetCredit = credits.stream()
                    .filter(c -> c.getAmount().compareTo(match.getPayment().getAmount()) == 0)
                    .findFirst()
                    .orElse(credits.get(0));

            match.setCreditEntry(targetCredit);
            match.setMatchedAmount(match.getPayment().getAmount().min(targetCredit.getAmount()));
            match.setReason("Reassigned to customer " + newCustomer.getName() + " by store owner");
        } else {
            match.setReason("Reassigned to customer " + newCustomer.getName() + " (no open credit entries found)");
        }

        ReconciliationMatch saved = reconciliationMatchRepository.save(match);
        return mapToResponse(saved);
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("User is not authenticated");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + email));
    }

    private ReconciliationMatchResponse mapToResponse(ReconciliationMatch match) {
        Customer customer = match.getCreditEntry().getCustomer();

        BigDecimal creditTotal = creditEntryRepository.sumAmountByCustomerId(customer.getId());
        BigDecimal paymentTotal = paymentRepository.sumAmountByCustomerId(customer.getId());
        BigDecimal balance = (creditTotal != null ? creditTotal : BigDecimal.ZERO)
                .subtract(paymentTotal != null ? paymentTotal : BigDecimal.ZERO);

        List<String> customerAliases = Collections.emptyList();
        try {
            customerAliases = customerAliasRepository.findAllByCustomerId(customer.getId())
                    .stream()
                    .map(CustomerAlias::getAliasName)
                    .collect(Collectors.toList());
        } catch (Exception ignored) {}

        // Identify candidate customers with similar names, aliases, or matching balances
        List<CandidateCustomerDto> candidateCustomers = findCandidateCustomers(customer, match);

        return ReconciliationMatchResponse.builder()
                .id(match.getId())
                .customerId(customer.getId())
                .customerName(customer.getName())
                .customerPhone(customer.getPhone())
                .customerAddress(customer.getAddress())
                .customerNotes(customer.getNotes())
                .customerHasPhoto(customer.getPhotoKey() != null && !customer.getPhotoKey().trim().isEmpty())
                .customerAliases(customerAliases)
                .customerOutstandingBalance(balance)
                .creditEntryId(match.getCreditEntry().getId())
                .creditAmount(match.getCreditEntry().getAmount())
                .creditDate(match.getCreditEntry().getEntryDate())
                .creditDescription(match.getCreditEntry().getDescription())
                .paymentId(match.getPayment().getId())
                .paymentAmount(match.getPayment().getAmount())
                .paymentDate(match.getPayment().getPaymentDate())
                .paymentReference(match.getPayment().getReference())
                .matchedAmount(match.getMatchedAmount())
                .confidence(match.getConfidence())
                .matchType(match.getMatchType())
                .verificationStatus(match.getVerificationStatus())
                .reason(match.getReason())
                .createdAt(match.getCreatedAt())
                .candidateCustomers(candidateCustomers)
                .build();
    }

    private List<CandidateCustomerDto> findCandidateCustomers(Customer currentCustomer, ReconciliationMatch match) {
        List<CandidateCustomerDto> candidates = new ArrayList<>();
        try {
            List<Customer> allCustomers = customerRepository.findAllByUserId(currentCustomer.getUser().getId());
            String primaryName = currentCustomer.getName().toLowerCase().trim();
            String[] tokens = primaryName.split("\\s+");
            String firstName = tokens.length > 0 ? tokens[0] : primaryName;

            for (Customer c : allCustomers) {
                if (c.getId().equals(currentCustomer.getId())) {
                    continue;
                }

                String otherName = c.getName().toLowerCase().trim();
                List<CustomerAlias> otherAliases = customerAliasRepository.findAllByCustomerId(c.getId());
                List<String> aliasStrings = otherAliases.stream().map(CustomerAlias::getAliasName).collect(Collectors.toList());

                boolean nameOverlap = otherName.contains(firstName) || primaryName.contains(otherName)
                        || aliasStrings.stream().anyMatch(a -> a.toLowerCase().contains(firstName) || firstName.contains(a.toLowerCase()));

                BigDecimal otherCreditTotal = creditEntryRepository.sumAmountByCustomerId(c.getId());
                BigDecimal otherPaymentTotal = paymentRepository.sumAmountByCustomerId(c.getId());
                BigDecimal otherBalance = (otherCreditTotal != null ? otherCreditTotal : BigDecimal.ZERO)
                        .subtract(otherPaymentTotal != null ? otherPaymentTotal : BigDecimal.ZERO);

                boolean balanceMatch = otherBalance.compareTo(BigDecimal.ZERO) > 0;

                if (nameOverlap || balanceMatch) {
                    double candidateConfidence = nameOverlap ? 0.85 : 0.60;
                    String matchReason = nameOverlap
                            ? "Similar party name or shared alias prefix with '" + currentCustomer.getName() + "'"
                            : "Customer has outstanding balance of ₹" + otherBalance;

                    candidates.add(CandidateCustomerDto.builder()
                            .id(c.getId())
                            .name(c.getName())
                            .phone(c.getPhone())
                            .address(c.getAddress())
                            .notes(c.getNotes())
                            .aliases(aliasStrings)
                            .hasPhoto(c.getPhotoKey() != null && !c.getPhotoKey().trim().isEmpty())
                            .outstandingBalance(otherBalance)
                            .confidence(BigDecimal.valueOf(candidateConfidence))
                            .matchReason(matchReason)
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("Error finding candidate customers for match: {}", e.getMessage());
        }

        // Limit to top 4 candidates sorted by confidence
        return candidates.stream()
                .sorted((a, b) -> b.getConfidence().compareTo(a.getConfidence()))
                .limit(4)
                .collect(Collectors.toList());
    }
}
