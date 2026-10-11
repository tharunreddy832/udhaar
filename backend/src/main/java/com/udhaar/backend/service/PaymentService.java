package com.udhaar.backend.service;

import com.udhaar.backend.dto.CreatePaymentRequest;
import com.udhaar.backend.dto.PaymentResponse;
import com.udhaar.backend.entity.Customer;
import com.udhaar.backend.entity.Payment;
import com.udhaar.backend.entity.User;
import com.udhaar.backend.entity.enums.PaymentSourceType;
import com.udhaar.backend.exception.ResourceNotFoundException;
import com.udhaar.backend.repository.CustomerRepository;
import com.udhaar.backend.repository.PaymentRepository;
import com.udhaar.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;

    @Transactional
    public PaymentResponse createPayment(Long customerId, CreatePaymentRequest request) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = getCustomerOwnedByUser(customerId, currentUser);

        if (!customer.isActive()) {
            throw new IllegalStateException(
                    "Cannot add payment entries to archived customer \"" + customer.getName() +
                    "\". Reactivate the customer first.");
        }

        Payment payment = Payment.builder()
                .customer(customer)
                .amount(request.getAmount())
                .paymentDate(request.getPaymentDate())
                .reference(request.getReference())
                .description(request.getDescription())
                .sourceType(PaymentSourceType.MANUAL)
                .build();

        Payment saved = paymentRepository.save(payment);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPayments(Long customerId) {
        User currentUser = getCurrentAuthenticatedUser();
        getCustomerOwnedByUser(customerId, currentUser); // ownership check

        return paymentRepository.findAllByCustomerIdOrderByPaymentDateDesc(customerId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private Customer getCustomerOwnedByUser(Long customerId, User user) {
        return customerRepository.findByIdAndUserId(customerId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));
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

    private PaymentResponse mapToResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .customerId(payment.getCustomer().getId())
                .customerName(payment.getCustomer().getName())
                .amount(payment.getAmount())
                .paymentDate(payment.getPaymentDate())
                .reference(payment.getReference())
                .description(payment.getDescription())
                .sourceType(payment.getSourceType())
                .createdAt(payment.getCreatedAt())
                .build();
    }
}
