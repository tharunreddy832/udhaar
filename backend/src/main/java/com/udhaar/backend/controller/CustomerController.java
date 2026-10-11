package com.udhaar.backend.controller;

import com.udhaar.backend.dto.*;
import com.udhaar.backend.service.CustomerService;
import com.udhaar.backend.service.PhotoStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<CustomerResponse> createCustomer(@Valid @RequestBody CreateCustomerRequest request) {
        CustomerResponse response = customerService.createCustomer(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<CustomerResponse>> getAllCustomers(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "archived", required = false) Boolean archived
    ) {
        List<CustomerResponse> responses = customerService.getAllCustomers(status, archived);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerResponse> getCustomerById(@PathVariable Long id) {
        CustomerResponse response = customerService.getCustomerById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerResponse> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerRequest request
    ) {
        CustomerResponse response = customerService.updateCustomer(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<CustomerResponse> archiveCustomer(@PathVariable Long id) {
        CustomerResponse response = customerService.archiveCustomer(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/reactivate")
    public ResponseEntity<CustomerResponse> reactivateCustomer(@PathVariable Long id) {
        CustomerResponse response = customerService.reactivateCustomer(id);
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // CUSTOMER PHOTO ENDPOINTS
    // ==========================================

    @PostMapping(value = "/{customerId}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomerResponse> uploadPhoto(
            @PathVariable Long customerId,
            @RequestParam("file") MultipartFile file
    ) {
        CustomerResponse response = customerService.uploadCustomerPhoto(customerId, file);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{customerId}/photo")
    public ResponseEntity<byte[]> getPhoto(@PathVariable Long customerId) {
        PhotoStorageService.PhotoData photoData = customerService.getCustomerPhoto(customerId);
        return ResponseEntity.ok()
                .contentType(photoData.getMediaType())
                .body(photoData.getBytes());
    }

    @DeleteMapping("/{customerId}/photo")
    public ResponseEntity<CustomerResponse> deletePhoto(@PathVariable Long customerId) {
        CustomerResponse response = customerService.deleteCustomerPhoto(customerId);
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // CUSTOMER ALIAS ENDPOINTS
    // ==========================================

    @GetMapping("/{customerId}/aliases")
    public ResponseEntity<List<CustomerAliasResponse>> getCustomerAliases(@PathVariable Long customerId) {
        List<CustomerAliasResponse> aliases = customerService.getCustomerAliases(customerId);
        return ResponseEntity.ok(aliases);
    }

    @PostMapping("/{customerId}/aliases")
    public ResponseEntity<CustomerAliasResponse> addCustomerAlias(
            @PathVariable Long customerId,
            @Valid @RequestBody CreateCustomerAliasRequest request
    ) {
        CustomerAliasResponse response = customerService.addCustomerAlias(customerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{customerId}/aliases/{aliasId}")
    public ResponseEntity<Void> deleteCustomerAlias(
            @PathVariable Long customerId,
            @PathVariable Long aliasId
    ) {
        customerService.deleteCustomerAlias(customerId, aliasId);
        return ResponseEntity.noContent().build();
    }
}
