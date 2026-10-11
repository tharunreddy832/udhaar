package com.udhaar.backend.service;

import com.udhaar.backend.dto.CreateCustomerRequest;
import com.udhaar.backend.dto.CustomerResponse;
import com.udhaar.backend.entity.Customer;
import com.udhaar.backend.entity.User;
import com.udhaar.backend.entity.enums.Role;
import com.udhaar.backend.exception.ResourceNotFoundException;
import com.udhaar.backend.repository.CreditEntryRepository;
import com.udhaar.backend.repository.CustomerAliasRepository;
import com.udhaar.backend.repository.CustomerRepository;
import com.udhaar.backend.repository.PaymentRepository;
import com.udhaar.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CreditEntryRepository creditEntryRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private CustomerAliasRepository customerAliasRepository;

    @Mock
    private PhotoStorageService photoStorageService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private CustomerService customerService;

    private User testUser;
    private Customer testCustomer;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("owner@test.com")
                .name("Test Owner")
                .role(Role.BUSINESS_OWNER)
                .build();

        testCustomer = Customer.builder()
                .id(10L)
                .user(testUser)
                .name("Ramesh Patel")
                .phone("9876543210")
                .createdAt(LocalDateTime.now())
                .build();

        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        lenient().when(authentication.isAuthenticated()).thenReturn(true);
        lenient().when(authentication.getPrincipal()).thenReturn("owner@test.com");
        lenient().when(authentication.getName()).thenReturn("owner@test.com");
        SecurityContextHolder.setContext(securityContext);
        lenient().when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(testUser));
    }

    @Test
    void testCreateCustomer_Success() {
        CreateCustomerRequest request = new CreateCustomerRequest();
        request.setName("Suresh Kumar");
        request.setPhone("9998887776");

        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> {
            Customer c = invocation.getArgument(0);
            c.setId(11L);
            return c;
        });

        when(creditEntryRepository.sumAmountByCustomerId(11L)).thenReturn(BigDecimal.ZERO);
        when(paymentRepository.sumAmountByCustomerId(11L)).thenReturn(BigDecimal.ZERO);

        CustomerResponse response = customerService.createCustomer(request);

        assertNotNull(response);
        assertEquals("Suresh Kumar", response.getName());
        assertEquals("9998887776", response.getPhone());
        assertEquals(BigDecimal.ZERO, response.getOutstandingBalance());
        verify(customerRepository, times(1)).save(any(Customer.class));
    }

    @Test
    void testGetCustomerById_OwnerIsolation_ThrowsWhenNotFoundOrOtherOwner() {
        when(customerRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            customerService.getCustomerById(99L);
        });
    }

    @Test
    void testDeleteCustomer_BlockedWhenFinancialRecordsExist() {
        when(customerRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCustomer));
        when(creditEntryRepository.sumAmountByCustomerId(10L)).thenReturn(BigDecimal.valueOf(500.00));
        when(paymentRepository.sumAmountByCustomerId(10L)).thenReturn(BigDecimal.ZERO);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            customerService.deleteCustomer(10L);
        });

        assertTrue(ex.getMessage().contains("Cannot delete customer with existing credit or payment records"));
        verify(customerRepository, never()).delete(any(Customer.class));
    }

    @Test
    void testDeleteCustomer_SuccessWhenNoRecords() {
        when(customerRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCustomer));
        when(creditEntryRepository.sumAmountByCustomerId(10L)).thenReturn(BigDecimal.ZERO);
        when(paymentRepository.sumAmountByCustomerId(10L)).thenReturn(BigDecimal.ZERO);

        customerService.deleteCustomer(10L);

        verify(customerRepository, times(1)).delete(testCustomer);
    }

    @Test
    void testArchiveCustomer_Success() {
        testCustomer.setActive(true);
        when(customerRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCustomer));
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CustomerResponse response = customerService.archiveCustomer(10L);

        assertNotNull(response);
        assertFalse(response.isActive());
        assertFalse(testCustomer.isActive());
        verify(customerRepository, times(1)).save(testCustomer);
    }

    @Test
    void testArchiveCustomer_OtherOwnerBlocked() {
        when(customerRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            customerService.archiveCustomer(99L);
        });
        verify(customerRepository, never()).save(any(Customer.class));
    }

    @Test
    void testReactivateCustomer_Success() {
        testCustomer.setActive(false);
        when(customerRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCustomer));
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CustomerResponse response = customerService.reactivateCustomer(10L);

        assertNotNull(response);
        assertTrue(response.isActive());
        assertTrue(testCustomer.isActive());
        verify(customerRepository, times(1)).save(testCustomer);
    }

    @Test
    void testReactivateCustomer_OtherOwnerBlocked() {
        when(customerRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            customerService.reactivateCustomer(99L);
        });
        verify(customerRepository, never()).save(any(Customer.class));
    }

    @Test
    void testGetAllCustomers_StatusActive() {
        when(customerRepository.findAllByUserIdAndActive(1L, true)).thenReturn(java.util.List.of(testCustomer));

        java.util.List<CustomerResponse> responses = customerService.getAllCustomers("active", null);

        assertEquals(1, responses.size());
        verify(customerRepository, times(1)).findAllByUserIdAndActive(1L, true);
    }

    @Test
    void testGetAllCustomers_StatusArchived() {
        testCustomer.setActive(false);
        when(customerRepository.findAllByUserIdAndActive(1L, false)).thenReturn(java.util.List.of(testCustomer));

        java.util.List<CustomerResponse> responses = customerService.getAllCustomers("archived", null);

        assertEquals(1, responses.size());
        verify(customerRepository, times(1)).findAllByUserIdAndActive(1L, false);
    }
}
