package com.udhaar.backend.service;

import com.udhaar.backend.dto.*;
import com.udhaar.backend.entity.CreditEntry;
import com.udhaar.backend.entity.Customer;
import com.udhaar.backend.entity.Payment;
import com.udhaar.backend.entity.User;
import com.udhaar.backend.entity.enums.CreditSourceType;
import com.udhaar.backend.entity.enums.PaymentSourceType;
import com.udhaar.backend.entity.enums.Role;
import com.udhaar.backend.repository.CreditEntryRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditPaymentLedgerTest {

    @Mock
    private CreditEntryRepository creditEntryRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    private User testUser;
    private Customer testCustomer;

    private CreditService creditService;
    private PaymentService paymentService;
    private LedgerService ledgerService;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("owner@test.com")
                .name("Owner")
                .role(Role.BUSINESS_OWNER)
                .build();

        testCustomer = Customer.builder()
                .id(10L)
                .user(testUser)
                .name("Ramesh")
                .build();

        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        lenient().when(authentication.isAuthenticated()).thenReturn(true);
        lenient().when(authentication.getPrincipal()).thenReturn("owner@test.com");
        lenient().when(authentication.getName()).thenReturn("owner@test.com");
        SecurityContextHolder.setContext(securityContext);
        lenient().when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(testUser));

        creditService = new CreditService(creditEntryRepository, customerRepository, userRepository);
        paymentService = new PaymentService(paymentRepository, customerRepository, userRepository);
        ledgerService = new LedgerService(customerRepository, creditEntryRepository, paymentRepository, userRepository);
    }

    @Test
    void testCreateCredit_Success() {
        when(customerRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCustomer));

        CreateCreditRequest req = new CreateCreditRequest();
        req.setAmount(BigDecimal.valueOf(1500.00));
        req.setEntryDate(LocalDate.now());
        req.setDescription("Goods purchased on credit");

        when(creditEntryRepository.save(any(CreditEntry.class))).thenAnswer(inv -> {
            CreditEntry c = inv.getArgument(0);
            c.setId(101L);
            c.setCreatedAt(LocalDateTime.now());
            return c;
        });

        CreditResponse res = creditService.createCredit(10L, req);

        assertNotNull(res);
        assertEquals(BigDecimal.valueOf(1500.00), res.getAmount());
        assertEquals("Ramesh", res.getCustomerName());
        assertEquals(CreditSourceType.MANUAL, res.getSourceType());
    }

    @Test
    void testCreatePayment_Success() {
        when(customerRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCustomer));

        CreatePaymentRequest req = new CreatePaymentRequest();
        req.setAmount(BigDecimal.valueOf(1000.00));
        req.setPaymentDate(LocalDate.now());
        req.setReference("UPI-1234");
        req.setDescription("UPI Payment received");

        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(201L);
            p.setCreatedAt(LocalDateTime.now());
            return p;
        });

        PaymentResponse res = paymentService.createPayment(10L, req);

        assertNotNull(res);
        assertEquals(BigDecimal.valueOf(1000.00), res.getAmount());
        assertEquals("Ramesh", res.getCustomerName());
        assertEquals(PaymentSourceType.MANUAL, res.getSourceType());
    }

    @Test
    void testGetLedger_CorrectOutstandingBalanceCalculation() {
        when(customerRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCustomer));
        when(creditEntryRepository.sumAmountByCustomerId(10L)).thenReturn(BigDecimal.valueOf(2500.00));
        when(paymentRepository.sumAmountByCustomerId(10L)).thenReturn(BigDecimal.valueOf(1000.00));
        when(creditEntryRepository.findAllByCustomerIdOrderByEntryDateDesc(10L)).thenReturn(Collections.emptyList());
        when(paymentRepository.findAllByCustomerIdOrderByPaymentDateDesc(10L)).thenReturn(Collections.emptyList());

        LedgerResponse ledger = ledgerService.getLedger(10L);

        assertNotNull(ledger);
        assertEquals(BigDecimal.valueOf(2500.00), ledger.getTotalCredit());
        assertEquals(BigDecimal.valueOf(1000.00), ledger.getTotalPaid());
        assertEquals(BigDecimal.valueOf(1500.00), ledger.getOutstandingBalance());
    }
}
