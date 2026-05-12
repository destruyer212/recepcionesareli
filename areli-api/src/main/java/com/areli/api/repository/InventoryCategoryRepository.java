package com.areli.api.repository;

import com.areli.api.domain.PaymentAndOperations.InventoryCategory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryCategoryRepository extends JpaRepository<InventoryCategory, UUID> {
    List<InventoryCategory> findByActivoTrueOrderByNombreAsc();
}
