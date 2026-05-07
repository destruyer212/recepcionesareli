package com.areli.api.web.dto;

import com.areli.api.domain.Enums.InventoryCondition;
import com.areli.api.domain.Floor;
import com.areli.api.domain.PaymentAndOperations.InventoryItem;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class InventoryDtos {
    private InventoryDtos() {
    }

    public record InventoryItemRequest(
            UUID floorId,
            @NotBlank String name,
            String category,
            @NotNull @Min(0) Integer quantity,
            @NotNull @DecimalMin("0.00") BigDecimal unitCost,
            String specificLocation,
            @Min(0) Integer minimumQuantity,
            InventoryCondition conditionStatus,
            LocalDate purchaseDate,
            String notes
    ) {
        public InventoryItem toEntity(Floor floor) {
            InventoryItem item = new InventoryItem();
            item.setFloor(floor);
            item.setName(name);
            item.setCategory(category);
            item.setQuantity(quantity == null ? 0 : quantity);
            item.setUnitCost(unitCost == null ? BigDecimal.ZERO : unitCost);
            item.setSpecificLocation(specificLocation);
            item.setLocation(floor == null ? null : floor.getName());
            item.setMinimumQuantity(minimumQuantity == null ? 0 : minimumQuantity);
            item.setConditionStatus(conditionStatus == null ? InventoryCondition.GOOD : conditionStatus);
            item.setPurchaseDate(purchaseDate);
            item.setNotes(notes);
            item.setActive(true);
            return item;
        }
    }

    public record InventoryItemResponse(
            UUID id,
            UUID floorId,
            String floorName,
            String name,
            String category,
            Integer quantity,
            BigDecimal unitCost,
            BigDecimal totalCost,
            String specificLocation,
            Integer minimumQuantity,
            InventoryCondition conditionStatus,
            LocalDate purchaseDate,
            String notes
    ) {
        public static InventoryItemResponse from(InventoryItem item) {
            BigDecimal unitCost = item.getUnitCost() == null ? BigDecimal.ZERO : item.getUnitCost();
            Integer quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            Floor floor = item.getFloor();
            return new InventoryItemResponse(
                    item.getId(),
                    floor == null ? null : floor.getId(),
                    floor == null ? "Sin ambiente" : floor.getName(),
                    item.getName(),
                    item.getCategory(),
                    quantity,
                    unitCost,
                    unitCost.multiply(BigDecimal.valueOf(quantity)),
                    item.getSpecificLocation(),
                    item.getMinimumQuantity(),
                    item.getConditionStatus(),
                    item.getPurchaseDate(),
                    item.getNotes());
        }
    }

    public record InventoryFloorSummary(
            UUID floorId,
            String floorName,
            long itemCount,
            long totalQuantity,
            BigDecimal totalValue
    ) {
    }

    public record InventorySummary(
            long itemCount,
            long totalQuantity,
            BigDecimal totalValue,
            List<InventoryFloorSummary> byFloor
    ) {
    }

    public record InventoryDashboardResponse(
            List<InventoryItemResponse> items,
            InventorySummary summary
    ) {
    }
}
