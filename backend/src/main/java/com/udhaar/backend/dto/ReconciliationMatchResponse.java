package com.udhaar.backend.dto;

import com.udhaar.backend.entity.enums.MatchType;
import com.udhaar.backend.entity.enums.VerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconciliationMatchResponse {

    private Long id;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private String customerAddress;
    private String customerNotes;
    private boolean customerHasPhoto;
    private List<String> customerAliases;
    private BigDecimal customerOutstandingBalance;

    private Long creditEntryId;
    private BigDecimal creditAmount;
    private LocalDate creditDate;
    private String creditDescription;

    private Long paymentId;
    private BigDecimal paymentAmount;
    private LocalDate paymentDate;
    private String paymentReference;

    private BigDecimal matchedAmount;
    private BigDecimal confidence;
    private MatchType matchType;
    private VerificationStatus verificationStatus;
    private String reason;
    private LocalDateTime createdAt;

    private List<CandidateCustomerDto> candidateCustomers;
}
