package com.areli.api.web.dto;

import com.areli.api.domain.PaymentAndOperations.InventoryCategory;
import com.areli.api.domain.PaymentAndOperations.InventoryItem;
import com.areli.api.domain.PaymentAndOperations.InventorySubcategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

public final class InventoryDtos {
    private InventoryDtos() {
    }

    public record InventoryItemRequest(
            @NotBlank String piso,
            @NotNull UUID categoriaId,
            @NotNull UUID subcategoriaId,
            @NotBlank String nombre,
            String descripcion,
            @NotNull @DecimalMin("0.01") BigDecimal cantidad,
            @NotBlank String unidadMedida,
            @NotNull @DecimalMin("0.00") BigDecimal valorTotal,
            String estado,
            String ubicacion,
            String observacion
    ) {
    }

    public record InventorySubcategoryResponse(
            UUID id,
            String nombre,
            String descripcion
    ) {
        public static InventorySubcategoryResponse from(InventorySubcategory subcategory) {
            return new InventorySubcategoryResponse(
                    subcategory.getId(),
                    subcategory.getNombre(),
                    subcategory.getDescripcion());
        }
    }

    public record InventoryCategoryResponse(
            UUID id,
            String nombre,
            String descripcion,
            List<InventorySubcategoryResponse> subcategorias
    ) {
        public static InventoryCategoryResponse from(
                InventoryCategory category,
                List<InventorySubcategoryResponse> subcategories) {
            return new InventoryCategoryResponse(
                    category.getId(),
                    category.getNombre(),
                    category.getDescripcion(),
                    subcategories);
        }
    }

    public record InventoryItemResponse(
            UUID id,
            String piso,
            UUID categoriaId,
            String categoria,
            UUID subcategoriaId,
            String subcategoria,
            String nombre,
            String descripcion,
            BigDecimal cantidad,
            String unidadMedida,
            BigDecimal valorUnitario,
            BigDecimal valorTotal,
            String estado,
            String ubicacion,
            String observacion
    ) {
        public static InventoryItemResponse from(InventoryItem item) {
            InventoryCategory category = item.getCategoria();
            InventorySubcategory subcategory = item.getSubcategoria();
            BigDecimal cantidad = valueOrZero(item.getCantidad());
            BigDecimal valorTotal = valueOrZero(item.getValorTotal());
            BigDecimal valorUnitario = cantidad.compareTo(BigDecimal.ZERO) > 0
                    ? valorTotal.divide(cantidad, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            return new InventoryItemResponse(
                    item.getId(),
                    item.getPiso(),
                    category == null ? null : category.getId(),
                    category == null ? "Sin categoria" : category.getNombre(),
                    subcategory == null ? null : subcategory.getId(),
                    subcategory == null ? "Sin subcategoria" : subcategory.getNombre(),
                    item.getNombre(),
                    item.getDescripcion(),
                    cantidad,
                    item.getUnidadMedida(),
                    valueOrZero(valorUnitario),
                    valorTotal,
                    item.getEstado(),
                    item.getUbicacion(),
                    item.getObservacion());
        }

        private static BigDecimal valueOrZero(BigDecimal value) {
            return value == null ? BigDecimal.ZERO : value;
        }
    }

    public record InventoryPisoSummary(
            String piso,
            long itemCount,
            BigDecimal totalQuantity,
            BigDecimal totalValue
    ) {
    }

    public record InventoryCategorySummary(
            String piso,
            String categoria,
            long itemCount,
            BigDecimal totalQuantity,
            BigDecimal totalValue
    ) {
    }

    public record InventorySummary(
            long itemCount,
            BigDecimal totalQuantity,
            BigDecimal totalValue,
            List<InventoryPisoSummary> byPiso,
            List<InventoryCategorySummary> byCategory
    ) {
    }

    public record InventoryDashboardResponse(
            List<InventoryCategoryResponse> categories,
            List<InventoryItemResponse> items,
            InventorySummary summary
    ) {
    }
}
