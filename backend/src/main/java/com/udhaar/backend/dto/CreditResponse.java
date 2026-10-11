package com.udhaar.backend.dto;

import com.udhaar.backend.entity.enums.CreditSourceType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class CreditResponse {

    private Long id;
    private Long customerId;
    private String customerName;
    private BigDecimal amount;
    private LocalDate entryDate;
    private String description;
    private CreditSourceType sourceType;
    private String sourceReference;
    private LocalDateTime createdAt;
}
