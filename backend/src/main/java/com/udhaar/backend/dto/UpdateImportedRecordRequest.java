package com.udhaar.backend.dto;

import com.udhaar.backend.entity.enums.RecordType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateImportedRecordRequest {

    private String extractedName;
    private BigDecimal extractedAmount;
    private LocalDate extractedDate;
    private String extractedDescription;
    private RecordType recordType;
    private Long customerId;
}
