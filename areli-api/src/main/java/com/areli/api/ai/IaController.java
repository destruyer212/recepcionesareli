package com.areli.api.ai;

import com.areli.api.ai.dto.IaEventoResponse;
import com.areli.api.ai.dto.IaMensajeRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ia")
public class IaController {
    private final GeminiIaService geminiIaService;

    public IaController(GeminiIaService geminiIaService) {
        this.geminiIaService = geminiIaService;
    }

    @PostMapping("/interpretar")
    public IaEventoResponse interpretar(@RequestBody @Valid IaMensajeRequest request) {
        return geminiIaService.interpretar(request);
    }
}
