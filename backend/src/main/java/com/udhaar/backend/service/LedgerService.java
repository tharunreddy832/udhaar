package com.udhaar.backend.service;

import com.udhaar.backend.dto.CreditResponse;
import com.udhaar.backend.dto.LedgerResponse;
import com.udhaar.backend.dto.PaymentResponse;
import com.udhaar.backend.entity.Customer;
import com.udhaar.backend.entity.User;
import com.udhaar.backend.entity.enums.CreditSourceType;
import com.udhaar.backend.entity.enums.PaymentSourceType;
import com.udhaar.backend.exception.ResourceNotFoundException;
import com.udhaar.backend.repository.CreditEntryRepository;
import com.udhaar.backend.repository.CustomerRepository;
import com.udhaar.backend.repository.PaymentRepository;
import com.udhaar.backend.repository.UserRepository;
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
public class LedgerService {

    private final CustomerRepository customerRepository;
    private final CreditEntryRepository creditEntryRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public LedgerResponse getLedger(Long customerId) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(customerId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));

        BigDecimal totalCredit = creditEntryRepository.sumAmountByCustomerId(customerId);
        BigDecimal totalPaid = paymentRepository.sumAmountByCustomerId(customerId);
        BigDecimal outstandingBalance = totalCredit.subtract(totalPaid);

        List<CreditResponse> credits = creditEntryRepository
                .findAllByCustomerIdOrderByEntryDateDesc(customerId)
                .stream()
                .map(entry -> CreditResponse.builder()
                        .id(entry.getId())
                        .customerId(customer.getId())
                        .customerName(customer.getName())
                        .amount(entry.getAmount())
                        .entryDate(entry.getEntryDate())
                        .description(entry.getDescription())
                        .sourceType(entry.getSourceType())
                        .sourceReference(entry.getSourceReference())
                        .createdAt(entry.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        List<PaymentResponse> payments = paymentRepository
                .findAllByCustomerIdOrderByPaymentDateDesc(customerId)
                .stream()
                .map(payment -> PaymentResponse.builder()
                        .id(payment.getId())
                        .customerId(customer.getId())
                        .customerName(customer.getName())
                        .amount(payment.getAmount())
                        .paymentDate(payment.getPaymentDate())
                        .reference(payment.getReference())
                        .description(payment.getDescription())
                        .sourceType(payment.getSourceType())
                        .createdAt(payment.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return LedgerResponse.builder()
                .customerId(customer.getId())
                .customerName(customer.getName())
                .totalCredit(totalCredit)
                .totalPaid(totalPaid)
                .outstandingBalance(outstandingBalance)
                .credits(credits)
                .payments(payments)
                .build();
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("User is not authenticated");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + email));
    }
}
