package com.areli.api.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record UpdateEventRequest(
        @NotBlank String title,
        @NotBlank String eventType,
        @NotNull LocalDate eventDate,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @NotNull @DecimalMin("0.00") BigDecimal totalAmount,
        @NotNull @DecimalMin("0.00") BigDecimal apdaycAmount,
        String apdaycPayer,
        String apdaycStatus,
        String apdaycNotes,
        Integer contractCapacityOverride,
        String notes
) {
}
