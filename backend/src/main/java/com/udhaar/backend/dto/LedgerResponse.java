package com.udhaar.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class LedgerResponse {

    private Long customerId;
    private String customerName;
    private BigDecimal totalCredit;
    private BigDecimal totalPaid;
    private BigDecimal outstandingBalance;
    private List<CreditResponse> credits;
    private List<PaymentResponse> payments;
}
