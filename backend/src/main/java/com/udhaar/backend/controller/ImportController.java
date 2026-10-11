package com.udhaar.backend.controller;

import com.udhaar.backend.dto.*;
import com.udhaar.backend.entity.enums.ImportSourceType;
import com.udhaar.backend.service.ImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/imports")
@RequiredArgsConstructor
public class ImportController {

    private final ImportService importService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportSourceResponse> createImport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sourceType", defaultValue = "UPI_STATEMENT") ImportSourceType sourceType
    ) {
        ImportSourceResponse response = importService.createImport(file, sourceType);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ImportSourceResponse>> getAllImports() {
        List<ImportSourceResponse> imports = importService.getAllImports();
        return ResponseEntity.ok(imports);
    }

    @GetMapping("/{importId}")
    public ResponseEntity<ImportSourceResponse> getImportById(@PathVariable Long importId) {
        ImportSourceResponse response = importService.getImportById(importId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{importId}/records")
    public ResponseEntity<List<ImportedRecordResponse>> getImportRecords(@PathVariable Long importId) {
        List<ImportedRecordResponse> records = importService.getImportRecords(importId);
        return ResponseEntity.ok(records);
    }

    @PatchMapping("/records/{recordId}")
    public ResponseEntity<ImportedRecordResponse> updateRecord(
            @PathVariable Long recordId,
            @RequestBody UpdateImportedRecordRequest request
    ) {
        ImportedRecordResponse response = importService.updateImportRecord(recordId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/records/{recordId}/approve")
    public ResponseEntity<ImportedRecordResponse> approveRecord(
            @PathVariable Long recordId,
            @RequestBody(required = false) ApproveRecordRequest request
    ) {
        ImportedRecordResponse response = importService.approveRecord(recordId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/records/{recordId}/reject")
    public ResponseEntity<ImportedRecordResponse> rejectRecord(@PathVariable Long recordId) {
        ImportedRecordResponse response = importService.rejectRecord(recordId);
        return ResponseEntity.ok(response);
    }
}
