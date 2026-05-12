package com.areli.api.repository;

import com.areli.api.domain.PaymentAndOperations.InventorySubcategory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface InventorySubcategoryRepository extends JpaRepository<InventorySubcategory, UUID> {
    @Query("""
            select subcategory
            from InventorySubcategory subcategory
            join fetch subcategory.categoria category
            where subcategory.activo = true
              and category.activo = true
            order by category.nombre, subcategory.nombre
            """)
    List<InventorySubcategory> findActiveWithCategory();
}
