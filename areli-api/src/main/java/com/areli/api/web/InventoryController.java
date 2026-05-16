package com.areli.api.web;

import com.areli.api.service.InventoryService;
import com.areli.api.web.dto.InventoryDtos.InventoryDashboardResponse;
import com.areli.api.web.dto.InventoryDtos.InventoryItemRequest;
import com.areli.api.web.dto.InventoryDtos.InventoryItemResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {
    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public InventoryDashboardResponse dashboard() {
        return inventoryService.dashboard();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryItemResponse create(@RequestBody @Valid InventoryItemRequest request) {
        return InventoryItemResponse.from(inventoryService.create(request));
    }

    @PutMapping("/{id}")
    public InventoryItemResponse update(@PathVariable UUID id, @RequestBody @Valid InventoryItemRequest request) {
        return InventoryItemResponse.from(inventoryService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable UUID id) {
        inventoryService.deactivate(id);
    }
}
