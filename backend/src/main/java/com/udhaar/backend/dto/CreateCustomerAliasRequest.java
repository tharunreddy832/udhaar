package com.udhaar.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCustomerAliasRequest {

    @NotBlank(message = "Alias name cannot be blank")
    @Size(max = 100, message = "Alias name cannot exceed 100 characters")
    private String aliasName;
}
