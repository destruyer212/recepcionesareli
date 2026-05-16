package com.areli.api.web;

import com.areli.api.domain.EventPackage;
import com.areli.api.repository.EventPackageRepository;
import com.areli.api.web.dto.ApiDtos.PackageRequest;
import com.areli.api.web.dto.ApiDtos.PackageResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/packages")
public class PackageController {
    private final EventPackageRepository packages;

    public PackageController(EventPackageRepository packages) {
        this.packages = packages;
    }

    @GetMapping
    public List<PackageResponse> list(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return (includeInactive ? packages.findAllByOrderByNameAsc() : packages.findByActiveTrueOrderByNameAsc())
                .stream()
                .map(PackageResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PackageResponse create(@RequestBody @Valid PackageRequest request) {
        EventPackage eventPackage = new EventPackage();
        apply(eventPackage, request);
        return PackageResponse.from(packages.save(eventPackage));
    }

    @PutMapping("/{id}")
    public PackageResponse update(@PathVariable UUID id, @RequestBody @Valid PackageRequest request) {
        EventPackage eventPackage = packages.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Paquete no encontrado"));
        apply(eventPackage, request);
        return PackageResponse.from(packages.save(eventPackage));
    }

    private static void apply(EventPackage eventPackage, PackageRequest request) {
        eventPackage.setName(cleanRequired(request.name(), "El nombre del paquete es obligatorio"));
        eventPackage.setEventType(cleanOptional(request.eventType()));
        eventPackage.setBasePrice(request.basePrice() == null ? BigDecimal.ZERO : request.basePrice());
        eventPackage.setIncludedCapacity(request.includedCapacity());
        eventPackage.setGuaranteeAmount(request.guaranteeAmount() == null ? BigDecimal.ZERO : request.guaranteeAmount());
        eventPackage.setIncludedServices(cleanOptional(request.includedServices()));
        eventPackage.setTerms(cleanOptional(request.terms()));
        eventPackage.setActive(request.active() == null || request.active());
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
}
