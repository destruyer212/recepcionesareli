package com.areli.api.service;

import com.areli.api.domain.Floor;
import com.areli.api.domain.PaymentAndOperations.InventoryItem;
import com.areli.api.repository.FloorRepository;
import com.areli.api.repository.InventoryItemRepository;
import com.areli.api.web.dto.InventoryDtos.InventoryDashboardResponse;
import com.areli.api.web.dto.InventoryDtos.InventoryFloorSummary;
import com.areli.api.web.dto.InventoryDtos.InventoryItemRequest;
import com.areli.api.web.dto.InventoryDtos.InventoryItemResponse;
import com.areli.api.web.dto.InventoryDtos.InventorySummary;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private final InventoryItemRepository inventoryItems;
    private final FloorRepository floors;

    public InventoryService(InventoryItemRepository inventoryItems, FloorRepository floors) {
        this.inventoryItems = inventoryItems;
        this.floors = floors;
    }

    @Transactional(readOnly = true)
    public InventoryDashboardResponse dashboard() {
        List<InventoryItem> items = inventoryItems.findActiveWithFloor();
        List<InventoryItemResponse> responses = items.stream().map(InventoryItemResponse::from).toList();
        return new InventoryDashboardResponse(responses, summarize(responses));
    }

    @Transactional
    public InventoryItem create(InventoryItemRequest request) {
        Floor floor = null;
        if (request.floorId() != null) {
            floor = floors.findById(request.floorId())
                    .orElseThrow(() -> new EntityNotFoundException("Ambiente no encontrado"));
        }
        return inventoryItems.save(request.toEntity(floor));
    }

    @Transactional
    public void deactivate(UUID id) {
        InventoryItem item = inventoryItems.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Articulo de inventario no encontrado"));
        item.setActive(false);
        inventoryItems.save(item);
    }

    private InventorySummary summarize(List<InventoryItemResponse> items) {
        long totalQuantity = 0;
        BigDecimal totalValue = BigDecimal.ZERO;
        Map<String, MutableFloorSummary> byFloor = new LinkedHashMap<>();

        for (InventoryItemResponse item : items) {
            long quantity = item.quantity() == null ? 0 : item.quantity();
            BigDecimal itemTotal = item.totalCost() == null ? BigDecimal.ZERO : item.totalCost();
            totalQuantity += quantity;
            totalValue = totalValue.add(itemTotal);

            String key = item.floorId() == null ? "sin-ambiente" : item.floorId().toString();
            MutableFloorSummary floor = byFloor.computeIfAbsent(
                    key,
                    ignored -> new MutableFloorSummary(item.floorId(), item.floorName()));
            floor.itemCount++;
            floor.totalQuantity += quantity;
            floor.totalValue = floor.totalValue.add(itemTotal);
        }

        List<InventoryFloorSummary> floorSummaries = new ArrayList<>();
        byFloor.values().forEach(summary -> floorSummaries.add(summary.toResponse()));
        return new InventorySummary(items.size(), totalQuantity, totalValue, floorSummaries);
    }

    private static class MutableFloorSummary {
        private final UUID floorId;
        private final String floorName;
        private long itemCount;
        private long totalQuantity;
        private BigDecimal totalValue = BigDecimal.ZERO;

        private MutableFloorSummary(UUID floorId, String floorName) {
            this.floorId = floorId;
            this.floorName = floorName;
        }

        private InventoryFloorSummary toResponse() {
            return new InventoryFloorSummary(floorId, floorName, itemCount, totalQuantity, totalValue);
        }
    }
}
