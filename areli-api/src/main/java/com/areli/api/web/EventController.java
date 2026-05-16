package com.areli.api.web;

import com.areli.api.service.ClientPaymentService;
import com.areli.api.service.EventService;
import com.areli.api.web.dto.ApiDtos.ClientPaymentRequest;
import com.areli.api.web.dto.ApiDtos.ClientPaymentResponse;
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
    private final ClientPaymentService clientPaymentService;

    public EventController(EventService eventService, ClientPaymentService clientPaymentService) {
        this.eventService = eventService;
        this.clientPaymentService = clientPaymentService;
    }

    @GetMapping
    public List<EventResponse> listUpcoming() {
        return eventService.listUpcoming().stream()
                .map(event -> EventResponse.from(event, eventService.paidAmount(event.getId())))
                .toList();
    }

    @GetMapping("/{id}/contract-preview")
    public ContractPreviewResponse contractPreview(@PathVariable UUID id) {
        return ContractPreviewResponse.from(eventService.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse create(@RequestBody @Valid CreateEventRequest request) {
        var event = eventService.create(request);
        return EventResponse.from(event, eventService.paidAmount(event.getId()));
    }

    @PutMapping("/{id}")
    public EventResponse update(@PathVariable UUID id, @RequestBody @Valid UpdateEventRequest request) {
        var event = eventService.update(id, request);
        return EventResponse.from(event, eventService.paidAmount(event.getId()));
    }

    @PostMapping("/{id}/cancel")
    public EventResponse cancel(@PathVariable UUID id, @RequestBody(required = false) CancelEventRequest request) {
        var event = eventService.cancel(id, request);
        return EventResponse.from(event, eventService.paidAmount(event.getId()));
    }

    @PostMapping("/{id}/reschedule")
    public EventResponse reschedule(@PathVariable UUID id, @RequestBody @Valid RescheduleEventRequest request) {
        var event = eventService.reschedule(id, request);
        return EventResponse.from(event, eventService.paidAmount(event.getId()));
    }

    @GetMapping("/{id}/payments")
    public List<ClientPaymentResponse> payments(@PathVariable UUID id) {
        return clientPaymentService.list(id).stream().map(ClientPaymentResponse::from).toList();
    }

    @PostMapping("/{id}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public ClientPaymentResponse createPayment(@PathVariable UUID id, @RequestBody @Valid ClientPaymentRequest request) {
        return ClientPaymentResponse.from(clientPaymentService.create(id, request));
    }

    @GetMapping("/{id}/reschedule-options")
    public RescheduleOptionsResponse rescheduleOptions(@PathVariable UUID id) {
        return eventService.rescheduleOptions(id);
    }
}
