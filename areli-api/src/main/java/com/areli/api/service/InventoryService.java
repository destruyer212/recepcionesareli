package com.areli.api.service;

import com.areli.api.domain.PaymentAndOperations.InventoryCategory;
import com.areli.api.domain.PaymentAndOperations.InventoryItem;
import com.areli.api.domain.PaymentAndOperations.InventorySubcategory;
import com.areli.api.repository.InventoryCategoryRepository;
import com.areli.api.repository.InventoryItemRepository;
import com.areli.api.repository.InventorySubcategoryRepository;
import com.areli.api.web.dto.InventoryDtos.InventoryCategoryResponse;
import com.areli.api.web.dto.InventoryDtos.InventoryCategorySummary;
import com.areli.api.web.dto.InventoryDtos.InventoryDashboardResponse;
import com.areli.api.web.dto.InventoryDtos.InventoryItemRequest;
import com.areli.api.web.dto.InventoryDtos.InventoryItemResponse;
import com.areli.api.web.dto.InventoryDtos.InventoryPisoSummary;
import com.areli.api.web.dto.InventoryDtos.InventorySubcategoryResponse;
import com.areli.api.web.dto.InventoryDtos.InventorySummary;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private static final String DEFAULT_ESTADO = "Disponible";
    private static final Set<String> VALID_ESTADOS = Set.of(
            "Disponible",
            "En uso",
            "Mantenimiento",
            "Dañado",
            "Perdido",
            "Retirado");

    private final InventoryItemRepository inventoryItems;
    private final InventoryCategoryRepository categories;
    private final InventorySubcategoryRepository subcategories;

    public InventoryService(
            InventoryItemRepository inventoryItems,
            InventoryCategoryRepository categories,
            InventorySubcategoryRepository subcategories) {
        this.inventoryItems = inventoryItems;
        this.categories = categories;
        this.subcategories = subcategories;
    }

    @Transactional(readOnly = true)
    public InventoryDashboardResponse dashboard() {
        Map<UUID, List<InventorySubcategory>> subcategoriesByCategory = new LinkedHashMap<>();
        subcategories.findActiveWithCategory().forEach(subcategory -> subcategoriesByCategory
                .computeIfAbsent(subcategory.getCategoria().getId(), ignored -> new ArrayList<>())
                .add(subcategory));
        List<InventoryCategoryResponse> categoryResponses = categories.findByActivoTrueOrderByNombreAsc().stream()
                .map(category -> InventoryCategoryResponse.from(
                        category,
                        subcategoriesByCategory.getOrDefault(category.getId(), List.of()).stream()
                                .map(InventorySubcategoryResponse::from)
                                .toList()))
                .toList();
        List<InventoryItemResponse> responses = inventoryItems.findActiveDetailed().stream()
                .map(InventoryItemResponse::from)
                .toList();
        return new InventoryDashboardResponse(categoryResponses, responses, summarize(responses));
    }

    @Transactional
    public InventoryItem create(InventoryItemRequest request) {
        InventoryCategory category = categories.findById(request.categoriaId())
                .filter(InventoryCategory::isActivo)
                .orElseThrow(() -> new EntityNotFoundException("Categoria de inventario no encontrada"));
        InventorySubcategory subcategory = subcategories.findById(request.subcategoriaId())
                .filter(InventorySubcategory::isActivo)
                .orElseThrow(() -> new EntityNotFoundException("Subcategoria de inventario no encontrada"));
        if (!subcategory.getCategoria().getId().equals(category.getId())) {
            throw new IllegalArgumentException("La subcategoria no pertenece a la categoria seleccionada");
        }

        String piso = cleanRequired(request.piso(), "El piso es obligatorio");
        String nombre = cleanRequired(request.nombre(), "El nombre del item es obligatorio");
        InventoryItem item = inventoryItems
                .findByPisoIgnoreCaseAndCategoria_IdAndSubcategoria_IdAndNombreIgnoreCase(
                        piso,
                        category.getId(),
                        subcategory.getId(),
                        nombre)
                .orElseGet(InventoryItem::new);

        item.setPiso(piso);
        item.setCategoria(category);
        item.setSubcategoria(subcategory);
        item.setNombre(nombre);
        item.setDescripcion(cleanOptional(request.descripcion()));
        item.setCantidad(request.cantidad());
        item.setUnidadMedida(cleanRequired(request.unidadMedida(), "La unidad de medida es obligatoria"));
        item.setValorTotal(request.valorTotal() == null ? BigDecimal.ZERO : request.valorTotal());
        item.setEstado(normalizeEstado(request.estado()));
        item.setUbicacion(cleanOptional(request.ubicacion()));
        item.setObservacion(cleanOptional(request.observacion()));
        item.setActivo(true);
        return inventoryItems.save(item);
    }

    @Transactional
    public void deactivate(UUID id) {
        InventoryItem item = inventoryItems.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Articulo de inventario no encontrado"));
        item.setActivo(false);
        inventoryItems.save(item);
    }

    private InventorySummary summarize(List<InventoryItemResponse> items) {
        BigDecimal totalQuantity = BigDecimal.ZERO;
        BigDecimal totalValue = BigDecimal.ZERO;
        Map<String, MutablePisoSummary> byPiso = new LinkedHashMap<>();
        Map<String, MutableCategorySummary> byCategory = new LinkedHashMap<>();

        for (InventoryItemResponse item : items) {
            BigDecimal quantity = item.cantidad() == null ? BigDecimal.ZERO : item.cantidad();
            BigDecimal itemTotal = item.valorTotal() == null ? BigDecimal.ZERO : item.valorTotal();
            totalQuantity = totalQuantity.add(quantity);
            totalValue = totalValue.add(itemTotal);

            MutablePisoSummary piso = byPiso.computeIfAbsent(
                    item.piso(),
                    ignored -> new MutablePisoSummary(item.piso()));
            piso.itemCount++;
            piso.totalQuantity = piso.totalQuantity.add(quantity);
            piso.totalValue = piso.totalValue.add(itemTotal);

            String categoryKey = item.piso() + "|" + item.categoria();
            MutableCategorySummary category = byCategory.computeIfAbsent(
                    categoryKey,
                    ignored -> new MutableCategorySummary(item.piso(), item.categoria()));
            category.itemCount++;
            category.totalQuantity = category.totalQuantity.add(quantity);
            category.totalValue = category.totalValue.add(itemTotal);
        }

        List<InventoryPisoSummary> pisoSummaries = new ArrayList<>();
        byPiso.values().forEach(summary -> pisoSummaries.add(summary.toResponse()));
        List<InventoryCategorySummary> categorySummaries = new ArrayList<>();
        byCategory.values().forEach(summary -> categorySummaries.add(summary.toResponse()));
        return new InventorySummary(items.size(), totalQuantity, totalValue, pisoSummaries, categorySummaries);
    }

    private static String normalizeEstado(String value) {
        String estado = value == null || value.isBlank() ? DEFAULT_ESTADO : value.trim();
        if (!VALID_ESTADOS.contains(estado)) {
            throw new IllegalArgumentException("Estado de inventario no valido");
        }
        return estado;
    }

    private static String cleanRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private static String cleanOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static class MutablePisoSummary {
        private final String piso;
        private long itemCount;
        private BigDecimal totalQuantity = BigDecimal.ZERO;
        private BigDecimal totalValue = BigDecimal.ZERO;

        private MutablePisoSummary(String piso) {
            this.piso = piso;
        }

        private InventoryPisoSummary toResponse() {
            return new InventoryPisoSummary(piso, itemCount, totalQuantity, totalValue);
        }
    }

    private static class MutableCategorySummary {
        private final String piso;
        private final String categoria;
        private long itemCount;
        private BigDecimal totalQuantity = BigDecimal.ZERO;
        private BigDecimal totalValue = BigDecimal.ZERO;

        private MutableCategorySummary(String piso, String categoria) {
            this.piso = piso;
            this.categoria = categoria;
        }

        private InventoryCategorySummary toResponse() {
            return new InventoryCategorySummary(piso, categoria, itemCount, totalQuantity, totalValue);
        }
    }
}
