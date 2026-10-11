package com.udhaar.backend.controller;

import com.udhaar.backend.dto.ReconciliationMatchResponse;
import com.udhaar.backend.service.ReconciliationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reconciliation")
@RequiredArgsConstructor
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    @GetMapping("/review")
    public ResponseEntity<List<ReconciliationMatchResponse>> getReviewQueue() {
        List<ReconciliationMatchResponse> matches = reconciliationService.getReviewQueue();
        return ResponseEntity.ok(matches);
    }

    @PostMapping("/customers/{customerId}/run")
    public ResponseEntity<List<ReconciliationMatchResponse>> runReconciliation(@PathVariable Long customerId) {
        List<ReconciliationMatchResponse> matches = reconciliationService.runReconciliation(customerId);
        return ResponseEntity.ok(matches);
    }

    @PostMapping("/matches/{matchId}/verify")
    public ResponseEntity<ReconciliationMatchResponse> verifyMatch(@PathVariable Long matchId) {
        ReconciliationMatchResponse response = reconciliationService.verifyMatch(matchId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/matches/{matchId}/reject")
    public ResponseEntity<ReconciliationMatchResponse> rejectMatch(@PathVariable Long matchId) {
        ReconciliationMatchResponse response = reconciliationService.rejectMatch(matchId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/matches/{matchId}/reassign")
    public ResponseEntity<ReconciliationMatchResponse> reassignMatch(
            @PathVariable Long matchId,
            @RequestParam("customerId") Long customerId
    ) {
        ReconciliationMatchResponse response = reconciliationService.reassignMatchCustomer(matchId, customerId);
        return ResponseEntity.ok(response);
    }
}
