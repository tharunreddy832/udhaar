package com.udhaar.backend.controller;

import com.udhaar.backend.dto.CreateCreditRequest;
import com.udhaar.backend.dto.CreditResponse;
import com.udhaar.backend.service.CreditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers/{customerId}/credits")
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;

    @PostMapping
    public ResponseEntity<CreditResponse> createCredit(
            @PathVariable Long customerId,
            @Valid @RequestBody CreateCreditRequest request) {
        CreditResponse response = creditService.createCredit(customerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<CreditResponse>> getCredits(@PathVariable Long customerId) {
        List<CreditResponse> credits = creditService.getCredits(customerId);
        return ResponseEntity.ok(credits);
    }
}
