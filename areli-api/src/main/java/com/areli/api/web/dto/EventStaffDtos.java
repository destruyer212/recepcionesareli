package com.areli.api.web.dto;

import com.areli.api.domain.Event;
import com.areli.api.domain.PaymentAndOperations.EventStaffAssignment;
import com.areli.api.domain.PaymentAndOperations.StaffMember;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public final class EventStaffDtos {
    private EventStaffDtos() {
    }

    public record EventStaffAssignmentRequest(
            @NotNull UUID staffMemberId,
            @NotBlank String roleKey,
            String roleLabel,
            Integer slotNumber,
            String notes
    ) {
    }

    public record EventStaffAssignmentResponse(
            UUID id,
            UUID eventId,
            UUID staffMemberId,
            String staffName,
            String staffPhone,
            String workerCategory,
            String roleKey,
            String roleLabel,
            Integer slotNumber,
            String notes
    ) {
        public static EventStaffAssignmentResponse from(EventStaffAssignment assignment) {
            StaffMember staff = assignment.getStaffMember();
            Event event = assignment.getEvent();
            return new EventStaffAssignmentResponse(
                    assignment.getId(),
                    event.getId(),
                    staff.getId(),
                    staff.getFullName(),
                    staff.getPhone(),
                    staff.getRole(),
                    assignment.getRoleKey(),
                    assignment.getRoleLabel(),
                    assignment.getSlotNumber(),
                    assignment.getNotes());
        }
    }

    public record StaffAvailabilityResponse(
            UUID staffMemberId,
            String staffName,
            String staffPhone,
            String workerCategory,
            boolean available,
            String reason,
            UUID conflictEventId,
            String conflictEventTitle,
            LocalDate conflictEventDate,
            LocalTime conflictStartTime,
            LocalTime conflictEndTime
    ) {
        public static StaffAvailabilityResponse available(StaffMember staff) {
            return new StaffAvailabilityResponse(
                    staff.getId(),
                    staff.getFullName(),
                    staff.getPhone(),
                    staff.getRole(),
                    true,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null);
        }

        public static StaffAvailabilityResponse unavailable(StaffMember staff, String reason, Event conflict) {
            return new StaffAvailabilityResponse(
                    staff.getId(),
                    staff.getFullName(),
                    staff.getPhone(),
                    staff.getRole(),
                    false,
                    reason,
                    conflict == null ? null : conflict.getId(),
                    conflict == null ? null : conflict.getTitle(),
                    conflict == null ? null : conflict.getEventDate(),
                    conflict == null ? null : conflict.getStartTime(),
                    conflict == null ? null : conflict.getEndTime());
        }
    }
}
