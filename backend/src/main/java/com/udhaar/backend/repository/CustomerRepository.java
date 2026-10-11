package com.udhaar.backend.repository;

import com.udhaar.backend.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    List<Customer> findAllByUserId(Long userId);

    List<Customer> findAllByUserIdAndActive(Long userId, boolean active);

    Optional<Customer> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    long countByUserIdAndActive(Long userId, boolean active);
}
