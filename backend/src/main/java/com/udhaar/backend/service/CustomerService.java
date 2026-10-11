package com.udhaar.backend.service;

import com.udhaar.backend.dto.*;
import com.udhaar.backend.entity.Customer;
import com.udhaar.backend.entity.CustomerAlias;
import com.udhaar.backend.entity.User;
import com.udhaar.backend.exception.ResourceNotFoundException;
import com.udhaar.backend.repository.CreditEntryRepository;
import com.udhaar.backend.repository.CustomerAliasRepository;
import com.udhaar.backend.repository.CustomerRepository;
import com.udhaar.backend.repository.PaymentRepository;
import com.udhaar.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerAliasRepository customerAliasRepository;
    private final UserRepository userRepository;
    private final CreditEntryRepository creditEntryRepository;
    private final PaymentRepository paymentRepository;
    private final PhotoStorageService photoStorageService;

    @Transactional
    public CustomerResponse createCustomer(CreateCustomerRequest request) {
        User currentUser = getCurrentAuthenticatedUser();

        Customer customer = Customer.builder()
                .name(request.getName().trim())
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .address(request.getAddress() != null ? request.getAddress().trim() : null)
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .user(currentUser)
                .active(true)
                .build();

        Customer savedCustomer = customerRepository.save(customer);
        return mapToResponse(savedCustomer);
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> getAllCustomers(String status, Boolean archived) {
        User currentUser = getCurrentAuthenticatedUser();
        List<Customer> customers;
        if ("archived".equalsIgnoreCase(status) || Boolean.TRUE.equals(archived)) {
            customers = customerRepository.findAllByUserIdAndActive(currentUser.getId(), false);
        } else if ("all".equalsIgnoreCase(status)) {
            customers = customerRepository.findAllByUserId(currentUser.getId());
        } else {
            // Default to active only: status == "active" or not provided
            customers = customerRepository.findAllByUserIdAndActive(currentUser.getId(), true);
        }
        return customers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> getAllCustomers(boolean includeArchived) {
        return getAllCustomers(includeArchived ? "all" : "active", null);
    }

    // ==========================================
    // ARCHIVE / REACTIVATE
    // ==========================================

    @Transactional
    public CustomerResponse archiveCustomer(Long id) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        customer.setActive(false);
        return mapToResponse(customerRepository.save(customer));
    }

    @Transactional
    public CustomerResponse reactivateCustomer(Long id) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        customer.setActive(true);
        return mapToResponse(customerRepository.save(customer));
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        return mapToResponse(customer);
    }

    @Transactional
    public CustomerResponse updateCustomer(Long id, UpdateCustomerRequest request) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        customer.setName(request.getName().trim());
        customer.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        customer.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        customer.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);

        Customer updatedCustomer = customerRepository.save(customer);
        return mapToResponse(updatedCustomer);
    }

    @Transactional
    public void deleteCustomer(Long id) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        BigDecimal totalCredit = creditEntryRepository.sumAmountByCustomerId(id);
        BigDecimal totalPaid = paymentRepository.sumAmountByCustomerId(id);
        boolean hasCredits = totalCredit != null && totalCredit.compareTo(BigDecimal.ZERO) > 0;
        boolean hasPayments = totalPaid != null && totalPaid.compareTo(BigDecimal.ZERO) > 0;

        if (hasCredits || hasPayments) {
            throw new IllegalStateException("Cannot delete customer with existing credit or payment records. Outstanding financial history must be preserved.");
        }

        // Clean up photo file if exists
        if (customer.getPhotoKey() != null) {
            photoStorageService.deletePhoto(customer.getPhotoKey());
        }

        // Delete associated aliases
        List<CustomerAlias> aliases = customerAliasRepository.findAllByCustomerId(id);
        customerAliasRepository.deleteAll(aliases);

        customerRepository.delete(customer);
    }

    // ==========================================
    // CUSTOMER PHOTO OPERATIONS
    // ==========================================

    @Transactional
    public CustomerResponse uploadCustomerPhoto(Long customerId, MultipartFile file) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(customerId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));

        String oldPhotoKey = customer.getPhotoKey();

        // Store new photo safely
        String newPhotoKey = photoStorageService.storePhoto(file);
        customer.setPhotoKey(newPhotoKey);
        Customer saved = customerRepository.save(customer);

        // Clean up previously stored photo
        if (oldPhotoKey != null && !oldPhotoKey.equals(newPhotoKey)) {
            photoStorageService.deletePhoto(oldPhotoKey);
        }

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public PhotoStorageService.PhotoData getCustomerPhoto(Long customerId) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(customerId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));

        if (customer.getPhotoKey() == null) {
            throw new ResourceNotFoundException("Customer does not have a profile photo");
        }

        return photoStorageService.loadPhoto(customer.getPhotoKey());
    }

    @Transactional
    public CustomerResponse deleteCustomerPhoto(Long customerId) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(customerId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));

        if (customer.getPhotoKey() != null) {
            String oldKey = customer.getPhotoKey();
            customer.setPhotoKey(null);
            customerRepository.save(customer);
            photoStorageService.deletePhoto(oldKey);
        }

        return mapToResponse(customer);
    }

    // ==========================================
    // CUSTOMER ALIAS OPERATIONS
    // ==========================================

    @Transactional(readOnly = true)
    public List<CustomerAliasResponse> getCustomerAliases(Long customerId) {
        User currentUser = getCurrentAuthenticatedUser();
        // verify owner isolation
        customerRepository.findByIdAndUserId(customerId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));

        return customerAliasRepository.findAllByCustomerId(customerId)
                .stream()
                .map(this::mapToAliasResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CustomerAliasResponse addCustomerAlias(Long customerId, CreateCustomerAliasRequest request) {
        User currentUser = getCurrentAuthenticatedUser();
        Customer customer = customerRepository.findByIdAndUserId(customerId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));

        String aliasName = request.getAliasName().trim();
        Optional<CustomerAlias> existing = customerAliasRepository.findByCustomerIdAndAliasNameIgnoreCase(customerId, aliasName);
        if (existing.isPresent()) {
            return mapToAliasResponse(existing.get());
        }

        CustomerAlias alias = CustomerAlias.builder()
                .customer(customer)
                .aliasName(aliasName)
                .source("MANUAL")
                .confidence(BigDecimal.ONE)
                .build();

        CustomerAlias saved = customerAliasRepository.save(alias);
        return mapToAliasResponse(saved);
    }

    @Transactional
    public void deleteCustomerAlias(Long customerId, Long aliasId) {
        User currentUser = getCurrentAuthenticatedUser();
        // verify owner isolation
        customerRepository.findByIdAndUserId(customerId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));

        CustomerAlias alias = customerAliasRepository.findById(aliasId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer alias not found: " + aliasId));

        if (!alias.getCustomer().getId().equals(customerId)) {
            throw new AccessDeniedException("Alias does not belong to specified customer");
        }

        customerAliasRepository.delete(alias);
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

    private CustomerResponse mapToResponse(Customer customer) {
        BigDecimal totalCredit = creditEntryRepository.sumAmountByCustomerId(customer.getId());
        BigDecimal totalPaid = paymentRepository.sumAmountByCustomerId(customer.getId());
        if (totalCredit == null) totalCredit = BigDecimal.ZERO;
        if (totalPaid == null) totalPaid = BigDecimal.ZERO;
        BigDecimal balance = totalCredit.subtract(totalPaid);

        List<String> aliases = Collections.emptyList();
        try {
            aliases = customerAliasRepository.findAllByCustomerId(customer.getId())
                    .stream()
                    .map(CustomerAlias::getAliasName)
                    .collect(Collectors.toList());
        } catch (Exception ignored) {}

        return CustomerResponse.builder()
                .id(customer.getId())
                .name(customer.getName())
                .phone(customer.getPhone())
                .address(customer.getAddress())
                .notes(customer.getNotes())
                .hasPhoto(customer.getPhotoKey() != null && !customer.getPhotoKey().trim().isEmpty())
                .active(customer.isActive())
                .aliases(aliases)
                .totalCredit(totalCredit)
                .totalPaid(totalPaid)
                .outstandingBalance(balance)
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt())
                .build();
    }

    private CustomerAliasResponse mapToAliasResponse(CustomerAlias alias) {
        return CustomerAliasResponse.builder()
                .id(alias.getId())
                .customerId(alias.getCustomer().getId())
                .aliasName(alias.getAliasName())
                .source(alias.getSource())
                .confidence(alias.getConfidence())
                .createdAt(alias.getCreatedAt())
                .build();
    }
}
