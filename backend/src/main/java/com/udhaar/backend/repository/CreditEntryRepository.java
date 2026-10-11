package com.udhaar.backend.repository;

import com.udhaar.backend.entity.CreditEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface CreditEntryRepository extends JpaRepository<CreditEntry, Long> {

    List<CreditEntry> findAllByCustomerIdOrderByEntryDateDesc(Long customerId);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM CreditEntry c WHERE c.customer.id = :customerId")
    BigDecimal sumAmountByCustomerId(@Param("customerId") Long customerId);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM CreditEntry c WHERE c.customer.user.id = :userId")
    BigDecimal sumAmountByUserId(@Param("userId") Long userId);

    List<CreditEntry> findTop10ByCustomerUserIdOrderByCreatedAtDesc(Long userId);
}
