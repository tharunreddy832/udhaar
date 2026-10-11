package com.udhaar.backend.service;

import com.udhaar.backend.dto.ReconciliationMatchResponse;
import com.udhaar.backend.entity.*;
import com.udhaar.backend.entity.enums.MatchType;
import com.udhaar.backend.entity.enums.Role;
import com.udhaar.backend.entity.enums.VerificationStatus;
import com.udhaar.backend.repository.*;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock
    private ReconciliationMatchRepository reconciliationMatchRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private CreditEntryRepository creditEntryRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private ReconciliationService reconciliationService;

    private User testUser;
    private Customer testCustomer;
    private CreditEntry testCredit;
    private Payment testPayment;

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

        testCredit = CreditEntry.builder()
                .id(100L)
                .customer(testCustomer)
                .amount(BigDecimal.valueOf(1000.00))
                .entryDate(LocalDate.now().minusDays(5))
                .build();

        testPayment = Payment.builder()
                .id(200L)
                .customer(testCustomer)
                .amount(BigDecimal.valueOf(1000.00))
                .paymentDate(LocalDate.now())
                .build();

        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        lenient().when(authentication.isAuthenticated()).thenReturn(true);
        lenient().when(authentication.getPrincipal()).thenReturn("owner@test.com");
        lenient().when(authentication.getName()).thenReturn("owner@test.com");
        SecurityContextHolder.setContext(securityContext);
        lenient().when(userRepository.findByEmail("owner@test.com")).thenReturn(Optional.of(testUser));
    }

    @Test
    void testRunReconciliation_ExactMatchGenerated() {
        when(customerRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCustomer));
        when(creditEntryRepository.findAllByCustomerIdOrderByEntryDateDesc(10L)).thenReturn(List.of(testCredit));
        when(paymentRepository.findAllByCustomerIdOrderByPaymentDateDesc(10L)).thenReturn(List.of(testPayment));
        when(reconciliationMatchRepository.sumMatchedAmountByPaymentId(200L)).thenReturn(BigDecimal.ZERO);
        when(reconciliationMatchRepository.sumMatchedAmountByCreditEntryId(100L)).thenReturn(BigDecimal.ZERO);
        when(reconciliationMatchRepository.findActiveMatch(100L, 200L)).thenReturn(Optional.empty());

        when(reconciliationMatchRepository.save(any(ReconciliationMatch.class))).thenAnswer(inv -> {
            ReconciliationMatch m = inv.getArgument(0);
            m.setId(500L);
            return m;
        });

        List<ReconciliationMatchResponse> matches = reconciliationService.runReconciliation(10L);

        assertEquals(1, matches.size());
        ReconciliationMatchResponse res = matches.get(0);
        assertEquals(BigDecimal.valueOf(1000.00), res.getMatchedAmount());
        assertEquals(VerificationStatus.NEEDS_REVIEW, res.getVerificationStatus());
        assertEquals(MatchType.AI, res.getMatchType());
        assertTrue(res.getConfidence().doubleValue() >= 0.90);
    }

    @Test
    void testVerifyMatch_Success() {
        ReconciliationMatch match = ReconciliationMatch.builder()
                .id(500L)
                .creditEntry(testCredit)
                .payment(testPayment)
                .matchedAmount(BigDecimal.valueOf(1000.00))
                .verificationStatus(VerificationStatus.NEEDS_REVIEW)
                .build();

        when(reconciliationMatchRepository.findByIdAndUserId(500L, 1L)).thenReturn(Optional.of(match));
        when(reconciliationMatchRepository.save(any(ReconciliationMatch.class))).thenReturn(match);

        ReconciliationMatchResponse res = reconciliationService.verifyMatch(500L);

        assertNotNull(res);
        assertEquals(VerificationStatus.VERIFIED, res.getVerificationStatus());
    }

    @Test
    void testRejectMatch_Success() {
        ReconciliationMatch match = ReconciliationMatch.builder()
                .id(500L)
                .creditEntry(testCredit)
                .payment(testPayment)
                .matchedAmount(BigDecimal.valueOf(1000.00))
                .verificationStatus(VerificationStatus.NEEDS_REVIEW)
                .build();

        when(reconciliationMatchRepository.findByIdAndUserId(500L, 1L)).thenReturn(Optional.of(match));
        when(reconciliationMatchRepository.save(any(ReconciliationMatch.class))).thenReturn(match);

        ReconciliationMatchResponse res = reconciliationService.rejectMatch(500L);

        assertNotNull(res);
        assertEquals(VerificationStatus.REJECTED, res.getVerificationStatus());
    }
}
