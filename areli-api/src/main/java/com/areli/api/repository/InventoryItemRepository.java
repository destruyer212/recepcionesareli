package com.areli.api.repository;

import com.areli.api.domain.PaymentAndOperations.InventoryItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, java.util.UUID> {
    @Query("""
            select item
            from InventoryItem item
            left join fetch item.floor
            where item.active = true
            order by coalesce(item.floor.levelNumber, 99), item.category, item.name
            """)
    List<InventoryItem> findActiveWithFloor();
}
