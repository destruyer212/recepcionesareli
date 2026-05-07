package com.areli.api.web;

import com.areli.api.service.EventService;
import com.areli.api.web.dto.ApiDtos.ContractPreviewResponse;
import com.areli.api.web.dto.ApiDtos.EventResponse;
import com.areli.api.web.dto.ApiDtos.RescheduleOptionsResponse;
import com.areli.api.web.dto.CancelEventRequest;
import com.areli.api.web.dto.CreateEventRequest;
import com.areli.api.web.dto.RescheduleEventRequest;
import com.areli.api.web.dto.UpdateEventRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/events")
public class EventController {
    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public List<EventResponse> listUpcoming() {
        return eventService.listUpcoming().stream().map(EventResponse::from).toList();
    }

    @GetMapping("/{id}/contract-preview")
    public ContractPreviewResponse contractPreview(@PathVariable UUID id) {
        return ContractPreviewResponse.from(eventService.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse create(@RequestBody @Valid CreateEventRequest request) {
        return EventResponse.from(eventService.create(request));
    }

    @PutMapping("/{id}")
    public EventResponse update(@PathVariable UUID id, @RequestBody @Valid UpdateEventRequest request) {
        return EventResponse.from(eventService.update(id, request));
    }

    @PostMapping("/{id}/cancel")
    public EventResponse cancel(@PathVariable UUID id, @RequestBody(required = false) CancelEventRequest request) {
        return EventResponse.from(eventService.cancel(id, request));
    }

    @PostMapping("/{id}/reschedule")
    public EventResponse reschedule(@PathVariable UUID id, @RequestBody @Valid RescheduleEventRequest request) {
        return EventResponse.from(eventService.reschedule(id, request));
    }

    @GetMapping("/{id}/reschedule-options")
    public RescheduleOptionsResponse rescheduleOptions(@PathVariable UUID id) {
        return eventService.rescheduleOptions(id);
    }
}
