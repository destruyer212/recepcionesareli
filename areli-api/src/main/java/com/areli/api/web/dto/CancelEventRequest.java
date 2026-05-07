package com.areli.api.web.dto;

import com.areli.api.domain.Enums.CancellationType;
import java.time.LocalDate;

public record CancelEventRequest(
        CancellationType cancellationType,
        LocalDate requestedAt,
        String cancellationNotes
) {
}
