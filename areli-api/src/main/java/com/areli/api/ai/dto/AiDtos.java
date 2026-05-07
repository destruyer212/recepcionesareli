package com.areli.api.ai.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public final class AiDtos {
    private AiDtos() {
    }

    public record ContractDraftRequest(
            @NotBlank String clientName,
            String clientDocument,
            @NotBlank String eventType,
            @NotBlank String floorName,
            LocalDate eventDate,
            LocalTime startTime,
            LocalTime endTime,
            @NotBlank String packageName,
            BigDecimal totalAmount,
            BigDecimal depositAmount,
            BigDecimal guaranteeAmount,
            String specialTerms
    ) {
    }

    public record EventSummaryRequest(
            @NotBlank String eventDetails
    ) {
    }

    public record MarketingCopyRequest(
            @NotBlank String packageName,
            @NotBlank String audience,
            String offerDetails
    ) {
    }

    public record BalanceExplanationRequest(
            BigDecimal income,
            BigDecimal staffPayments,
            BigDecimal expenses,
            BigDecimal pendingBalance,
            String period
    ) {
    }

    public record AiResponse(String provider, String model, String result) {
    }
}
