package com.areli.api.web;

import com.areli.api.service.EventStaffAssignmentService;
import com.areli.api.web.dto.EventStaffDtos.EventStaffAssignmentRequest;
import com.areli.api.web.dto.EventStaffDtos.EventStaffAssignmentResponse;
import com.areli.api.web.dto.EventStaffDtos.StaffAvailabilityResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/events/{eventId}/staff-assignments")
public class EventStaffAssignmentController {
    private final EventStaffAssignmentService eventStaffAssignmentService;

    public EventStaffAssignmentController(EventStaffAssignmentService eventStaffAssignmentService) {
        this.eventStaffAssignmentService = eventStaffAssignmentService;
    }

    @GetMapping
    public List<EventStaffAssignmentResponse> list(@PathVariable UUID eventId) {
        return eventStaffAssignmentService.list(eventId).stream()
                .map(EventStaffAssignmentResponse::from)
                .toList();
    }

    @GetMapping("/availability")
    public List<StaffAvailabilityResponse> availability(
            @PathVariable UUID eventId,
            @RequestParam String roleKey) {
        return eventStaffAssignmentService.availability(eventId, roleKey);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventStaffAssignmentResponse assign(
            @PathVariable UUID eventId,
            @RequestBody @Valid EventStaffAssignmentRequest request) {
        return EventStaffAssignmentResponse.from(eventStaffAssignmentService.assign(eventId, request));
    }

    @DeleteMapping("/{assignmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable UUID eventId, @PathVariable UUID assignmentId) {
        eventStaffAssignmentService.remove(eventId, assignmentId);
    }
}
