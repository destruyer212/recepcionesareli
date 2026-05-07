package com.areli.api.web;

import com.areli.api.domain.Enums.DocumentType;
import com.areli.api.service.PeruApiLookupService;
import com.areli.api.web.dto.ApiDtos.ClientLookupResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de integración (p. ej. consulta RENIEC/SUNAT vía Perú API).
 * Ruta separada para evitar conflictos y facilitar despliegues.
 */
@RestController
@RequestMapping("/api/integration")
public class IntegrationController {
    private final PeruApiLookupService peruApiLookupService;

    public IntegrationController(PeruApiLookupService peruApiLookupService) {
        this.peruApiLookupService = peruApiLookupService;
    }

    @GetMapping("/document-lookup")
    public ClientLookupResponse documentLookup(
            @RequestParam DocumentType documentType,
            @RequestParam String documentNumber) {
        String digitsOnly = documentNumber.replaceAll("\\D", "");
        var result = peruApiLookupService.lookupValidated(documentType, digitsOnly);
        return new ClientLookupResponse(documentType, digitsOnly, result.fullName(), result.address());
    }
}
