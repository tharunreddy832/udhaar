package com.udhaar.backend.service;

import com.udhaar.backend.dto.CreditResponse;
import com.udhaar.backend.dto.DashboardSummaryResponse;
import com.udhaar.backend.dto.PaymentResponse;
import com.udhaar.backend.entity.User;
import com.udhaar.backend.entity.enums.ImportStatus;
import com.udhaar.backend.entity.enums.ProcessingStatus;
import com.udhaar.backend.entity.enums.VerificationStatus;
import com.udhaar.backend.exception.ResourceNotFoundException;
import com.udhaar.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CustomerRepository customerRepository;
    private final CreditEntryRepository creditEntryRepository;
    private final PaymentRepository paymentRepository;
    private final ImportSourceRepository importSourceRepository;
    private final ImportedRecordRepository importedRecordRepository;
    private final ReconciliationMatchRepository reconciliationMatchRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary() {
        User currentUser = getCurrentAuthenticatedUser();
        Long userId = currentUser.getId();

        long totalCustomers = customerRepository.countByUserId(userId);
        BigDecimal totalCredit = creditEntryRepository.sumAmountByUserId(userId);
        BigDecimal totalPaid = paymentRepository.sumAmountByUserId(userId);
        if (totalCredit == null) totalCredit = BigDecimal.ZERO;
        if (totalPaid == null) totalPaid = BigDecimal.ZERO;
        BigDecimal totalOutstanding = totalCredit.subtract(totalPaid);

        long pendingImports = importSourceRepository.countByUserIdAndStatus(userId, ImportStatus.PROCESSING)
                + importSourceRepository.countByUserIdAndStatus(userId, ImportStatus.UPLOADED);
        long awaitingRecords = importedRecordRepository.countByUserIdAndProcessingStatus(userId, ProcessingStatus.NEEDS_REVIEW)
                + importedRecordRepository.countByUserIdAndProcessingStatus(userId, ProcessingStatus.PENDING);
        long pendingReconciliation = reconciliationMatchRepository.findAllByUserIdAndVerificationStatus(userId, VerificationStatus.NEEDS_REVIEW).size();

        List<CreditResponse> recentCredits = creditEntryRepository
                .findTop10ByCustomerUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(credit -> CreditResponse.builder()
                        .id(credit.getId())
                        .customerId(credit.getCustomer().getId())
                        .customerName(credit.getCustomer().getName())
                        .amount(credit.getAmount())
                        .entryDate(credit.getEntryDate())
                        .description(credit.getDescription())
                        .sourceType(credit.getSourceType())
                        .sourceReference(credit.getSourceReference())
                        .createdAt(credit.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        List<PaymentResponse> recentPayments = paymentRepository
                .findTop10ByCustomerUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(payment -> PaymentResponse.builder()
                        .id(payment.getId())
                        .customerId(payment.getCustomer().getId())
                        .customerName(payment.getCustomer().getName())
                        .amount(payment.getAmount())
                        .paymentDate(payment.getPaymentDate())
                        .reference(payment.getReference())
                        .description(payment.getDescription())
                        .sourceType(payment.getSourceType())
                        .createdAt(payment.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return DashboardSummaryResponse.builder()
                .totalCustomers(totalCustomers)
                .totalOutstandingCredit(totalOutstanding)
                .totalCreditRecorded(totalCredit)
                .totalPaymentsRecorded(totalPaid)
                .pendingImportsCount(pendingImports)
                .recordsAwaitingReviewCount(awaitingRecords)
                .pendingReconciliationCount(pendingReconciliation)
                .recentCredits(recentCredits)
                .recentPayments(recentPayments)
                .build();
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
}
