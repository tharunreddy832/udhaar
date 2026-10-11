package com.udhaar.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerAliasResponse {

    private Long id;
    private Long customerId;
    private String aliasName;
    private String source;
    private BigDecimal confidence;
    private LocalDateTime createdAt;
}
