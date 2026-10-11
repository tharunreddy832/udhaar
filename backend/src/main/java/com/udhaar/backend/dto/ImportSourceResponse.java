package com.udhaar.backend.dto;

import com.udhaar.backend.entity.enums.ImportSourceType;
import com.udhaar.backend.entity.enums.ImportStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportSourceResponse {

    private Long id;
    private String fileName;
    private ImportSourceType sourceType;
    private ImportStatus status;
    private int totalRecords;
    private int processedRecords;
    private LocalDateTime createdAt;
}
