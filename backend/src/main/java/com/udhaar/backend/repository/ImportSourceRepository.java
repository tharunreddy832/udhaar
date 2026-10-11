package com.udhaar.backend.repository;

import com.udhaar.backend.entity.ImportSource;
import com.udhaar.backend.entity.enums.ImportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImportSourceRepository extends JpaRepository<ImportSource, Long> {

    List<ImportSource> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<ImportSource> findByIdAndUserId(Long id, Long userId);

    long countByUserIdAndStatus(Long userId, ImportStatus status);
}
