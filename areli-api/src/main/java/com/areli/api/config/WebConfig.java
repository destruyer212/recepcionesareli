package com.areli.api.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final List<String> allowedOrigins;

    /**
     * Desde {@code APP_CORS_ALLOWED_ORIGINS} llega una sola cadena con orígenes separados por coma; en producción
     * debe coincidir con la URL HTTPS del SPA (ej. {@code https://app.tudominio.com}).
     */
    public WebConfig(@Value("${app.cors.allowed-origins}") String corsAllowedOriginsRaw) {
        this.allowedOrigins =
                Arrays.stream(corsAllowedOriginsRaw.split(","))
                        .map((s) -> s.trim())
                        .filter((s) -> !s.isEmpty())
                        .toList();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Content-Disposition");
    }
}
