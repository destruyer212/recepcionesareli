package com.areli.api.web.dto;

import com.areli.api.domain.Enums.CancellationType;
import com.areli.api.domain.Enums.CancellationPaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CancelEventRequest(
        CancellationType cancellationType,
        LocalDate requestedAt,
        String cancellationNotes,
        CancellationPaymentStatus cancellationPaymentStatus,
        BigDecimal refundedAmount,
        String cancellationReason,
        LocalDate cancellationDate,
        String cancellationObservation
) {
}
