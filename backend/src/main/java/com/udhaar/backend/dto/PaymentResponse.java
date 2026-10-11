package com.udhaar.backend.dto;

import com.udhaar.backend.entity.enums.PaymentSourceType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponse {

    private Long id;
    private Long customerId;
    private String customerName;
    private BigDecimal amount;
    private LocalDate paymentDate;
    private String reference;
    private String description;
    private PaymentSourceType sourceType;
    private LocalDateTime createdAt;
}
