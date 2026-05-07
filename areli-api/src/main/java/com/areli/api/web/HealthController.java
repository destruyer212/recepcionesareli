package com.areli.api.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    @GetMapping
    public Status health() {
        return new Status("ok", "areli-api");
    }

    public record Status(String status, String service) {
    }
}
