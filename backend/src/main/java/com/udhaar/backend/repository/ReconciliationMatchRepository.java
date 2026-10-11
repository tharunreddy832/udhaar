package com.udhaar.backend.repository;

import com.udhaar.backend.entity.ReconciliationMatch;
import com.udhaar.backend.entity.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReconciliationMatchRepository extends JpaRepository<ReconciliationMatch, Long> {

    @Query("SELECT m FROM ReconciliationMatch m WHERE m.creditEntry.customer.user.id = :userId ORDER BY m.createdAt DESC")
    List<ReconciliationMatch> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT m FROM ReconciliationMatch m WHERE m.creditEntry.customer.user.id = :userId AND m.verificationStatus = :status ORDER BY m.createdAt DESC")
    List<ReconciliationMatch> findAllByUserIdAndVerificationStatus(@Param("userId") Long userId, @Param("status") VerificationStatus status);

    @Query("SELECT m FROM ReconciliationMatch m WHERE m.id = :id AND m.creditEntry.customer.user.id = :userId")
    Optional<ReconciliationMatch> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(m.matchedAmount), 0) FROM ReconciliationMatch m WHERE m.creditEntry.id = :creditEntryId AND m.verificationStatus != 'REJECTED'")
    BigDecimal sumMatchedAmountByCreditEntryId(@Param("creditEntryId") Long creditEntryId);

    @Query("SELECT COALESCE(SUM(m.matchedAmount), 0) FROM ReconciliationMatch m WHERE m.payment.id = :paymentId AND m.verificationStatus != 'REJECTED'")
    BigDecimal sumMatchedAmountByPaymentId(@Param("paymentId") Long paymentId);

    @Query("SELECT m FROM ReconciliationMatch m WHERE m.creditEntry.customer.id = :customerId ORDER BY m.createdAt DESC")
    List<ReconciliationMatch> findAllByCustomerId(@Param("customerId") Long customerId);

    @Query("SELECT m FROM ReconciliationMatch m WHERE m.creditEntry.id = :creditEntryId AND m.payment.id = :paymentId AND m.verificationStatus != 'REJECTED'")
    Optional<ReconciliationMatch> findActiveMatch(@Param("creditEntryId") Long creditEntryId, @Param("paymentId") Long paymentId);
}
