package com.udhaar.backend.controller;

import com.udhaar.backend.dto.CreatePaymentRequest;
import com.udhaar.backend.dto.PaymentResponse;
import com.udhaar.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers/{customerId}/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    public ResponseEntity<PaymentResponse> createPayment(
            @PathVariable Long customerId,
            @Valid @RequestBody CreatePaymentRequest request) {
        PaymentResponse response = paymentService.createPayment(customerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<PaymentResponse>> getPayments(@PathVariable Long customerId) {
        List<PaymentResponse> payments = paymentService.getPayments(customerId);
        return ResponseEntity.ok(payments);
    }
}
