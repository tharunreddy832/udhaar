package com.udhaar.backend.repository;

import com.udhaar.backend.entity.CustomerAlias;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerAliasRepository extends JpaRepository<CustomerAlias, Long> {

    List<CustomerAlias> findAllByCustomerId(Long customerId);

    List<CustomerAlias> findAllByCustomerUserId(Long userId);

    Optional<CustomerAlias> findByCustomerIdAndAliasNameIgnoreCase(Long customerId, String aliasName);
}
