package com.areli.api.web.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record RescheduleEventRequest(
        @NotNull LocalDate eventDate,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime
) {
}
