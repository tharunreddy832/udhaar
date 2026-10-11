package com.udhaar.backend.service;

import com.udhaar.backend.dto.*;
import com.udhaar.backend.entity.*;
import com.udhaar.backend.entity.enums.*;
import com.udhaar.backend.exception.ResourceNotFoundException;
import com.udhaar.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportService {

    private final ImportSourceRepository importSourceRepository;
    private final ImportedRecordRepository importedRecordRepository;
    private final CustomerRepository customerRepository;
    private final CustomerAliasRepository customerAliasRepository;
    private final CreditEntryRepository creditEntryRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final AiServiceClient aiServiceClient;

    @Transactional
    public ImportSourceResponse createImport(MultipartFile file, ImportSourceType sourceType) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Upload file cannot be empty");
        }

        User currentUser = getCurrentAuthenticatedUser();

        ImportSource importSource = ImportSource.builder()
                .user(currentUser)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "imported_file")
                .sourceType(sourceType)
                .status(ImportStatus.PROCESSING)
                .build();
        importSource = importSourceRepository.save(importSource);

        try {
            // Build known customer list for matching
            List<Customer> userCustomers = customerRepository.findAllByUserId(currentUser.getId());
            List<Map<String, Object>> customerData = new ArrayList<>();
            for (Customer c : userCustomers) {
                Map<String, Object> cMap = new HashMap<>();
                cMap.put("id", c.getId());
                cMap.put("name", c.getName());
                List<String> aliases = customerAliasRepository.findAllByCustomerId(c.getId())
                        .stream().map(CustomerAlias::getAliasName).collect(Collectors.toList());
                cMap.put("aliases", aliases);
                customerData.add(cMap);
            }

            Map<String, Object> extractionResult = aiServiceClient.extractRecords(file, sourceType.name(), customerData);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> recordsList = (List<Map<String, Object>>) extractionResult.getOrDefault("records", Collections.emptyList());

            int count = 0;
            for (Map<String, Object> r : recordsList) {
                String rTypeStr = String.valueOf(r.getOrDefault("recordType", "UNKNOWN")).toUpperCase();
                RecordType recordType = RecordType.UNKNOWN;
                try {
                    recordType = RecordType.valueOf(rTypeStr);
                } catch (Exception ignored) {}

                String rawText = (String) r.get("rawText");
                String name = (String) r.get("extractedName");
                String desc = (String) r.get("extractedDescription");
                String dateStr = (String) r.get("extractedDate");

                BigDecimal amount = BigDecimal.ZERO;
                Object amtObj = r.get("extractedAmount");
                if (amtObj instanceof Number) {
                    amount = BigDecimal.valueOf(((Number) amtObj).doubleValue());
                } else if (amtObj != null) {
                    try {
                        amount = new BigDecimal(amtObj.toString());
                    } catch (Exception ignored) {}
                }

                LocalDate date = LocalDate.now();
                if (dateStr != null) {
                    try {
                        date = LocalDate.parse(dateStr);
                    } catch (Exception ignored) {}
                }

                ImportedRecord record = ImportedRecord.builder()
                        .importSource(importSource)
                        .recordType(recordType)
                        .rawText(rawText != null ? rawText : "")
                        .extractedName(name != null ? name : "Unknown")
                        .extractedAmount(amount)
                        .extractedDate(date)
                        .extractedDescription(desc)
                        .processingStatus(ProcessingStatus.NEEDS_REVIEW)
                        .build();

                importedRecordRepository.save(record);
                count++;
            }

            importSource.setStatus(ImportStatus.COMPLETED);
            importSource = importSourceRepository.save(importSource);

            return mapToSourceResponse(importSource, count, 0);

        } catch (Exception e) {
            log.error("Failed to process import: {}", e.getMessage(), e);
            importSource.setStatus(ImportStatus.FAILED);
            importSourceRepository.save(importSource);
            throw new RuntimeException("Import processing failed: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<ImportSourceResponse> getAllImports() {
        User currentUser = getCurrentAuthenticatedUser();
        List<ImportSource> imports = importSourceRepository.findAllByUserIdOrderByCreatedAtDesc(currentUser.getId());

        return imports.stream().map(source -> {
            List<ImportedRecord> records = importedRecordRepository.findAllByImportSourceIdOrderByCreatedAtAsc(source.getId());
            int total = records.size();
            int processed = (int) records.stream().filter(r -> r.getProcessingStatus() == ProcessingStatus.PROCESSED).count();
            return mapToSourceResponse(source, total, processed);
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ImportSourceResponse getImportById(Long importId) {
        User currentUser = getCurrentAuthenticatedUser();
        ImportSource source = importSourceRepository.findByIdAndUserId(importId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Import not found with id: " + importId));

        List<ImportedRecord> records = importedRecordRepository.findAllByImportSourceIdOrderByCreatedAtAsc(source.getId());
        int total = records.size();
        int processed = (int) records.stream().filter(r -> r.getProcessingStatus() == ProcessingStatus.PROCESSED).count();
        return mapToSourceResponse(source, total, processed);
    }

    @Transactional(readOnly = true)
    public List<ImportedRecordResponse> getImportRecords(Long importId) {
        User currentUser = getCurrentAuthenticatedUser();
        // verify ownership of parent import source
        importSourceRepository.findByIdAndUserId(importId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Import not found with id: " + importId));

        List<Customer> userCustomers = customerRepository.findAllByUserId(currentUser.getId());

        return importedRecordRepository.findAllByImportSourceIdAndUserId(importId, currentUser.getId())
                .stream()
                .map(rec -> mapToRecordResponse(rec, userCustomers))
                .collect(Collectors.toList());
    }

    @Transactional
    public ImportedRecordResponse updateImportRecord(Long recordId, UpdateImportedRecordRequest request) {
        User currentUser = getCurrentAuthenticatedUser();
        ImportedRecord record = importedRecordRepository.findByIdAndUserId(recordId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Imported record not found: " + recordId));

        if (record.getProcessingStatus() == ProcessingStatus.PROCESSED) {
            throw new IllegalStateException("Cannot edit an already processed record.");
        }

        if (request.getExtractedName() != null) record.setExtractedName(request.getExtractedName().trim());
        if (request.getExtractedAmount() != null) record.setExtractedAmount(request.getExtractedAmount());
        if (request.getExtractedDate() != null) record.setExtractedDate(request.getExtractedDate());
        if (request.getExtractedDescription() != null) record.setExtractedDescription(request.getExtractedDescription());
        if (request.getRecordType() != null) record.setRecordType(request.getRecordType());

        ImportedRecord updated = importedRecordRepository.save(record);
        List<Customer> userCustomers = customerRepository.findAllByUserId(currentUser.getId());
        return mapToRecordResponse(updated, userCustomers);
    }

    @Transactional
    public ImportedRecordResponse approveRecord(Long recordId, ApproveRecordRequest request) {
        User currentUser = getCurrentAuthenticatedUser();
        ImportedRecord record = importedRecordRepository.findByIdAndUserId(recordId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Imported record not found: " + recordId));

        if (record.getProcessingStatus() == ProcessingStatus.PROCESSED) {
            throw new IllegalStateException("Record has already been approved and converted to a financial entry.");
        }

        Long customerId = request != null ? request.getCustomerId() : null;
        Customer customer = null;
        if (customerId != null) {
            customer = customerRepository.findByIdAndUserId(customerId, currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));
        } else {
            // Find existing customer by exact name or first match
            List<Customer> matches = customerRepository.findAllByUserId(currentUser.getId());
            customer = matches.stream()
                    .filter(c -> c.getName().equalsIgnoreCase(record.getExtractedName()))
                    .findFirst()
                    .orElse(null);
        }

        if (customer == null) {
            throw new IllegalArgumentException("Please assign or select a valid customer before approving this transaction.");
        }

        if (record.getExtractedAmount() == null || record.getExtractedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transaction amount must be greater than 0");
        }

        ImportSource source = record.getImportSource();
        LocalDate txnDate = record.getExtractedDate() != null ? record.getExtractedDate() : LocalDate.now();
        String desc = record.getExtractedDescription() != null ? record.getExtractedDescription() : "Imported from " + source.getFileName();
        String ref = "Import #" + source.getId();

        // Convert to financial entry based on record type
        if (record.getRecordType() == RecordType.CREDIT) {
            CreditSourceType sourceType = CreditSourceType.MANUAL;
            if (source.getSourceType() == ImportSourceType.NOTEBOOK) sourceType = CreditSourceType.NOTEBOOK;
            else if (source.getSourceType() == ImportSourceType.CHAT) sourceType = CreditSourceType.CHAT;

            CreditEntry credit = CreditEntry.builder()
                    .customer(customer)
                    .amount(record.getExtractedAmount())
                    .entryDate(txnDate)
                    .description(desc)
                    .sourceType(sourceType)
                    .sourceReference(ref)
                    .build();
            creditEntryRepository.save(credit);

        } else { // PAYMENT or default
            PaymentSourceType paymentSourceType = PaymentSourceType.MANUAL;
            if (source.getSourceType() == ImportSourceType.UPI_STATEMENT) paymentSourceType = PaymentSourceType.UPI_STATEMENT;
            else if (source.getSourceType() == ImportSourceType.CHAT) paymentSourceType = PaymentSourceType.CHAT;

            Payment payment = Payment.builder()
                    .customer(customer)
                    .amount(record.getExtractedAmount())
                    .paymentDate(txnDate)
                    .reference(ref)
                    .description(desc)
                    .sourceType(paymentSourceType)
                    .build();
            paymentRepository.save(payment);
        }

        // Save alias if extracted name is different from official customer name
        if (record.getExtractedName() != null && !record.getExtractedName().equalsIgnoreCase(customer.getName())) {
            Optional<CustomerAlias> existingAlias = customerAliasRepository.findByCustomerIdAndAliasNameIgnoreCase(customer.getId(), record.getExtractedName());
            if (existingAlias.isEmpty()) {
                CustomerAlias alias = CustomerAlias.builder()
                        .customer(customer)
                        .aliasName(record.getExtractedName())
                        .source(source.getSourceType().name())
                        .confidence(BigDecimal.valueOf(0.95))
                        .build();
                customerAliasRepository.save(alias);
            }
        }

        record.setProcessingStatus(ProcessingStatus.PROCESSED);
        ImportedRecord saved = importedRecordRepository.save(record);

        List<Customer> userCustomers = customerRepository.findAllByUserId(currentUser.getId());
        return mapToRecordResponse(saved, userCustomers);
    }

    @Transactional
    public ImportedRecordResponse rejectRecord(Long recordId) {
        User currentUser = getCurrentAuthenticatedUser();
        ImportedRecord record = importedRecordRepository.findByIdAndUserId(recordId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Imported record not found: " + recordId));

        if (record.getProcessingStatus() == ProcessingStatus.PROCESSED) {
            throw new IllegalStateException("Cannot reject a record that has already been confirmed and processed.");
        }

        record.setProcessingStatus(ProcessingStatus.FAILED);
        ImportedRecord saved = importedRecordRepository.save(record);

        List<Customer> userCustomers = customerRepository.findAllByUserId(currentUser.getId());
        return mapToRecordResponse(saved, userCustomers);
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("User is not authenticated");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + email));
    }

    private ImportSourceResponse mapToSourceResponse(ImportSource source, int total, int processed) {
        return ImportSourceResponse.builder()
                .id(source.getId())
                .fileName(source.getFileName())
                .sourceType(source.getSourceType())
                .status(source.getStatus())
                .totalRecords(total)
                .processedRecords(processed)
                .createdAt(source.getCreatedAt())
                .build();
    }

    private ImportedRecordResponse mapToRecordResponse(ImportedRecord rec, List<Customer> customers) {
        Customer matched = customers.stream()
                .filter(c -> c.getName().equalsIgnoreCase(rec.getExtractedName()))
                .findFirst().orElse(null);

        List<CandidateCustomerDto> candidateCustomers = new ArrayList<>();
        String extractedRaw = rec.getExtractedName() != null ? rec.getExtractedName().toLowerCase().trim() : "";
        String[] tokens = extractedRaw.split("\\s+");
        String firstToken = tokens.length > 0 ? tokens[0] : extractedRaw;

        for (Customer c : customers) {
            String cName = c.getName().toLowerCase().trim();
            List<CustomerAlias> cAliases = customerAliasRepository.findAllByCustomerId(c.getId());
            List<String> aliasNames = cAliases.stream().map(CustomerAlias::getAliasName).collect(Collectors.toList());

            boolean exactMatch = cName.equalsIgnoreCase(extractedRaw)
                    || aliasNames.stream().anyMatch(a -> a.equalsIgnoreCase(extractedRaw));

            boolean fuzzyMatch = !exactMatch && (cName.contains(firstToken) || extractedRaw.contains(cName)
                    || aliasNames.stream().anyMatch(a -> a.toLowerCase().contains(firstToken) || firstToken.contains(a.toLowerCase())));

            if (exactMatch || fuzzyMatch) {
                BigDecimal creditTotal = creditEntryRepository.sumAmountByCustomerId(c.getId());
                BigDecimal paymentTotal = paymentRepository.sumAmountByCustomerId(c.getId());
                BigDecimal balance = (creditTotal != null ? creditTotal : BigDecimal.ZERO)
                        .subtract(paymentTotal != null ? paymentTotal : BigDecimal.ZERO);

                double candConfidence = exactMatch ? 0.95 : 0.75;
                String candReason = exactMatch
                        ? "Exact customer name or alias match"
                        : "Name similarity with extracted term '" + rec.getExtractedName() + "'";

                candidateCustomers.add(CandidateCustomerDto.builder()
                        .id(c.getId())
                        .name(c.getName())
                        .phone(c.getPhone())
                        .address(c.getAddress())
                        .notes(c.getNotes())
                        .aliases(aliasNames)
                        .hasPhoto(c.getPhotoKey() != null && !c.getPhotoKey().trim().isEmpty())
                        .outstandingBalance(balance)
                        .confidence(BigDecimal.valueOf(candConfidence))
                        .matchReason(candReason)
                        .build());
            }
        }

        candidateCustomers.sort((a, b) -> b.getConfidence().compareTo(a.getConfidence()));

        // If matched is null but candidates exist, suggest top candidate
        if (matched == null && !candidateCustomers.isEmpty()) {
            CandidateCustomerDto top = candidateCustomers.get(0);
            matched = customers.stream().filter(c -> c.getId().equals(top.getId())).findFirst().orElse(null);
        }

        return ImportedRecordResponse.builder()
                .id(rec.getId())
                .importSourceId(rec.getImportSource().getId())
                .importFileName(rec.getImportSource().getFileName())
                .recordType(rec.getRecordType())
                .rawText(rec.getRawText())
                .extractedName(rec.getExtractedName())
                .extractedAmount(rec.getExtractedAmount())
                .extractedDate(rec.getExtractedDate())
                .extractedDescription(rec.getExtractedDescription())
                .processingStatus(rec.getProcessingStatus())
                .createdAt(rec.getCreatedAt())
                .suggestedCustomerId(matched != null ? matched.getId() : null)
                .suggestedCustomerName(matched != null ? matched.getName() : null)
                .confidence(matched != null ? (matched.getName().equalsIgnoreCase(rec.getExtractedName()) ? BigDecimal.valueOf(0.95) : BigDecimal.valueOf(0.75)) : BigDecimal.valueOf(0.50))
                .reason(matched != null ? "Customer matched by identity resolution" : "Needs manual customer assignment")
                .candidateCustomers(candidateCustomers)
                .build();
    }
}
