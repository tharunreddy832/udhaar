package com.udhaar.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse {

    private long totalCustomers;
    private BigDecimal totalOutstandingCredit;
    private BigDecimal totalCreditRecorded;
    private BigDecimal totalPaymentsRecorded;
    private long pendingImportsCount;
    private long recordsAwaitingReviewCount;
    private long pendingReconciliationCount;
    private List<CreditResponse> recentCredits;
    private List<PaymentResponse> recentPayments;
}
