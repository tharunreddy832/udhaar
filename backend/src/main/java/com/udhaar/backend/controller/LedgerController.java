package com.udhaar.backend.controller;

import com.udhaar.backend.dto.LedgerResponse;
import com.udhaar.backend.service.LedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers/{customerId}/ledger")
@RequiredArgsConstructor
public class LedgerController {

    private final LedgerService ledgerService;

    @GetMapping
    public ResponseEntity<LedgerResponse> getLedger(@PathVariable Long customerId) {
        LedgerResponse response = ledgerService.getLedger(customerId);
        return ResponseEntity.ok(response);
    }
}
