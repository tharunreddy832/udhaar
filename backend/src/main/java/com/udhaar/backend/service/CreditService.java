package com.udhaar.backend.service;

import com.udhaar.backend.dto.CreateCreditRequest;
import com.udhaar.backend.dto.CreditResponse;
import com.udhaar.backend.entity.CreditEntry;
import com.udhaar.backend.entity.Customer;
import com.udhaar.backend.entity.User;
import com.udhaar.backend.entity.enums.CreditSourceType;
import com.udhaar.backend.exception.ResourceNotFoundException;
import com.udhaar.backend.repository.CreditEntryRepository;
import com.udhaar.backend.repository.CustomerRepository;
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
public class CreditService {

    private final CreditEntryRepository creditEntryRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;

    @Transactional
    public CreditResponse createCredit(Long customerId, CreateCreditRequest request) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = getCustomerOwnedByUser(customerId, currentUser);

        if (!customer.isActive()) {
            throw new IllegalStateException(
                    "Cannot add credit entries to archived customer \"" + customer.getName() +
                    "\". Reactivate the customer first.");
        }

        CreditEntry entry = CreditEntry.builder()
                .customer(customer)
                .amount(request.getAmount())
                .entryDate(request.getEntryDate())
                .description(request.getDescription())
                .sourceType(CreditSourceType.MANUAL)
                .build();

        CreditEntry saved = creditEntryRepository.save(entry);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CreditResponse> getCredits(Long customerId) {
        User currentUser = getCurrentAuthenticatedUser();
        getCustomerOwnedByUser(customerId, currentUser); // ownership check

        return creditEntryRepository.findAllByCustomerIdOrderByEntryDateDesc(customerId)
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

    private CreditResponse mapToResponse(CreditEntry entry) {
        return CreditResponse.builder()
                .id(entry.getId())
                .customerId(entry.getCustomer().getId())
                .customerName(entry.getCustomer().getName())
                .amount(entry.getAmount())
                .entryDate(entry.getEntryDate())
                .description(entry.getDescription())
                .sourceType(entry.getSourceType())
                .sourceReference(entry.getSourceReference())
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
