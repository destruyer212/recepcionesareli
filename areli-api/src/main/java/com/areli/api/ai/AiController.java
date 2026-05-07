package com.areli.api.ai;

import com.areli.api.ai.dto.AiDtos.AiResponse;
import com.areli.api.ai.dto.AiDtos.BalanceExplanationRequest;
import com.areli.api.ai.dto.AiDtos.ContractDraftRequest;
import com.areli.api.ai.dto.AiDtos.EventSummaryRequest;
import com.areli.api.ai.dto.AiDtos.MarketingCopyRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {
    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/contracts/draft")
    public AiResponse draftContract(@RequestBody @Valid ContractDraftRequest request) {
        return new AiResponse("openai", aiService.model(), aiService.draftContract(request));
    }

    @PostMapping("/events/summary")
    public AiResponse summarizeEvent(@RequestBody @Valid EventSummaryRequest request) {
        return new AiResponse("openai", aiService.model(), aiService.summarizeEvent(request));
    }

    @PostMapping("/marketing/copy")
    public AiResponse marketingCopy(@RequestBody @Valid MarketingCopyRequest request) {
        return new AiResponse("openai", aiService.model(), aiService.marketingCopy(request));
    }

    @PostMapping("/balance/explain")
    public AiResponse explainBalance(@RequestBody @Valid BalanceExplanationRequest request) {
        return new AiResponse("openai", aiService.model(), aiService.explainBalance(request));
    }
}
