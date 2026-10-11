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
public class CandidateCustomerDto {

    private Long id;
    private String name;
    private String phone;
    private String address;
    private String notes;
    private List<String> aliases;
    private boolean hasPhoto;
    private BigDecimal outstandingBalance;
    private BigDecimal confidence;
    private String matchReason;
}
