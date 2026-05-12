package com.areli.api.web;

import java.time.Duration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Imágenes públicas usadas al generar el contrato (PDF en el frontend). Ruta bajo {@code /api/**} para heredar CORS.
 */
@RestController
@RequestMapping("/api/public")
public class ContractSignatureController {

    private static final String LESSOR_SIGNATURE = "contract-signatures/lessor-signature.png";

    @GetMapping(value = "/contract-signatures/lessor", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<Resource> lessorSignaturePng() {
        ClassPathResource resource = new ClassPathResource(LESSOR_SIGNATURE);
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
                .body(resource);
    }
}
