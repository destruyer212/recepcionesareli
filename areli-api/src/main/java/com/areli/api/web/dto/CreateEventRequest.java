package com.areli.api.web.dto;

import com.areli.api.domain.Enums.EventStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record CreateEventRequest(
        @NotNull UUID clientId,
        @NotNull UUID floorId,
        UUID packageId,
        @NotBlank String title,
        @NotBlank String eventType,
        @NotNull LocalDate eventDate,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        EventStatus status,
        @NotNull @DecimalMin("0.00") BigDecimal totalAmount,
        @NotNull @DecimalMin("0.00") BigDecimal apdaycAmount,
        @NotNull @Positive Integer contractCapacityOverride,
        String apdaycPayer,
        String apdaycStatus,
        String apdaycNotes,
        String notes
) {
    public CreateEventRequest {
        if (status == null) {
            status = EventStatus.INQUIRY;
        }
        if (apdaycAmount == null) {
            apdaycAmount = BigDecimal.ZERO;
        }
        if (apdaycPayer == null || apdaycPayer.isBlank()) {
            apdaycPayer = "CLIENT";
        }
        if (apdaycStatus == null || apdaycStatus.isBlank()) {
            apdaycStatus = "PENDING";
        }
    }
}
