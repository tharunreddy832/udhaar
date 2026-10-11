package com.udhaar.backend.repository;

import com.udhaar.backend.entity.ImportedRecord;
import com.udhaar.backend.entity.enums.ProcessingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImportedRecordRepository extends JpaRepository<ImportedRecord, Long> {

    List<ImportedRecord> findAllByImportSourceIdOrderByCreatedAtAsc(Long importSourceId);

    @Query("SELECT r FROM ImportedRecord r WHERE r.importSource.id = :importSourceId AND r.importSource.user.id = :userId ORDER BY r.createdAt ASC")
    List<ImportedRecord> findAllByImportSourceIdAndUserId(@Param("importSourceId") Long importSourceId, @Param("userId") Long userId);

    @Query("SELECT r FROM ImportedRecord r WHERE r.id = :id AND r.importSource.user.id = :userId")
    Optional<ImportedRecord> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Query("SELECT COUNT(r) FROM ImportedRecord r WHERE r.importSource.user.id = :userId AND r.processingStatus = :status")
    long countByUserIdAndProcessingStatus(@Param("userId") Long userId, @Param("status") ProcessingStatus status);

    @Query("SELECT r FROM ImportedRecord r WHERE r.importSource.user.id = :userId AND r.processingStatus = :status ORDER BY r.createdAt DESC")
    List<ImportedRecord> findAllByUserIdAndProcessingStatus(@Param("userId") Long userId, @Param("status") ProcessingStatus status);
}
