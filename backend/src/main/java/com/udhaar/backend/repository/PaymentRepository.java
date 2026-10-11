package com.udhaar.backend.repository;

import com.udhaar.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findAllByCustomerIdOrderByPaymentDateDesc(Long customerId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.customer.id = :customerId")
    BigDecimal sumAmountByCustomerId(@Param("customerId") Long customerId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.customer.user.id = :userId")
    BigDecimal sumAmountByUserId(@Param("userId") Long userId);

    List<Payment> findTop10ByCustomerUserIdOrderByCreatedAtDesc(Long userId);
}
