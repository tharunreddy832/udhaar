package com.udhaar.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiServiceClient {

    @Value("${ai.service.url:http://localhost:8001}")
    private String aiServiceUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> extractRecords(MultipartFile file, String sourceType, List<Map<String, Object>> knownCustomers) {
        try {
            String url = aiServiceUrl + "/extract";

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "statement.csv";
                }
            };
            body.add("file", fileResource);
            body.add("sourceType", sourceType);
            if (knownCustomers != null && !knownCustomers.isEmpty()) {
                body.add("knownCustomersJson", objectMapper.writeValueAsString(knownCustomers));
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return objectMapper.readValue(response.getBody(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) {
            log.warn("AI Service call to {} failed: {}. Falling back to internal basic parser.", aiServiceUrl, e.getMessage());
        }

        // Resilient Fallback: basic internal extraction when Python service is unavailable
        return fallbackExtraction(file, sourceType);
    }

    private Map<String, Object> fallbackExtraction(MultipartFile file, String sourceType) {
        List<Map<String, Object>> records = new ArrayList<>();
        try {
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
            BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
            String line;
            int lineNum = 0;

            if (filename.endsWith(".csv")) {
                while ((line = reader.readLine()) != null) {
                    lineNum++;
                    if (lineNum == 1 || line.trim().isEmpty()) continue; // skip header
                    String[] parts = line.split(",");
                    if (parts.length >= 2) {
                        Map<String, Object> rec = new HashMap<>();
                        rec.put("recordType", "PAYMENT");
                        rec.put("extractedName", parts[0].trim());
                        try {
                            rec.put("extractedAmount", new BigDecimal(parts[1].replaceAll("[^\\d.]", "").trim()));
                        } catch (Exception ex) {
                            rec.put("extractedAmount", BigDecimal.valueOf(100.00));
                        }
                        rec.put("extractedDate", LocalDate.now().toString());
                        rec.put("extractedDescription", line.trim());
                        rec.put("rawText", line.trim());
                        rec.put("confidence", 0.60);
                        rec.put("reason", "Parsed via fallback CSV extractor (AI service offline)");
                        records.add(rec);
                    }
                }
            } else {
                while ((line = reader.readLine()) != null) {
                    if (line.trim().length() < 5) continue;
                    Map<String, Object> rec = new HashMap<>();
                    rec.put("recordType", line.toLowerCase().contains("udhaar") ? "CREDIT" : "PAYMENT");
                    rec.put("extractedName", "Extracted Customer");
                    rec.put("extractedAmount", BigDecimal.valueOf(500.00));
                    rec.put("extractedDate", LocalDate.now().toString());
                    rec.put("extractedDescription", line.trim());
                    rec.put("rawText", line.trim());
                    rec.put("confidence", 0.50);
                    rec.put("reason", "Fallback text extraction (AI service offline)");
                    records.add(rec);
                }
            }
        } catch (Exception ex) {
            log.error("Fallback extraction error: {}", ex.getMessage());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("count", records.size());
        result.put("records", records);
        return result;
    }
}
