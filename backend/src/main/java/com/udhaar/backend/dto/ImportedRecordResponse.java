package com.udhaar.backend.dto;

import com.udhaar.backend.entity.enums.RecordType;
import com.udhaar.backend.entity.enums.ProcessingStatus;
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
public class ImportedRecordResponse {

    private Long id;
    private Long importSourceId;
    private String importFileName;
    private RecordType recordType;
    private String rawText;
    private String extractedName;
    private BigDecimal extractedAmount;
    private LocalDate extractedDate;
    private String extractedDescription;
    private ProcessingStatus processingStatus;
    private LocalDateTime createdAt;
    private Long suggestedCustomerId;
    private String suggestedCustomerName;
    private BigDecimal confidence;
    private String reason;

    private List<CandidateCustomerDto> candidateCustomers;
}
