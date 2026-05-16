package com.areli.api.service;

import com.areli.api.domain.Client;
import com.areli.api.domain.Event;
import com.areli.api.domain.Enums.CancellationPaymentStatus;
import com.areli.api.domain.Enums.CancellationType;
import com.areli.api.domain.Enums.EventStatus;
import com.areli.api.domain.EventPackage;
import com.areli.api.domain.Floor;
import com.areli.api.repository.ClientRepository;
import com.areli.api.repository.ClientPaymentRepository;
import com.areli.api.repository.EventPackageRepository;
import com.areli.api.repository.EventRepository;
import com.areli.api.repository.FloorRepository;
import com.areli.api.web.dto.ApiDtos.RescheduleOptionEvent;
import com.areli.api.web.dto.ApiDtos.RescheduleOptionsResponse;
import com.areli.api.web.dto.CancelEventRequest;
import com.areli.api.web.dto.CreateEventRequest;
import com.areli.api.web.dto.RescheduleEventRequest;
import com.areli.api.web.dto.UpdateEventRequest;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventService {
    private final EventRepository events;
    private final ClientRepository clients;
    private final FloorRepository floors;
    private final EventPackageRepository packages;
    private final AppSettingsService appSettingsService;
    private final ClientPaymentRepository payments;

    public EventService(
            EventRepository events,
            ClientRepository clients,
            FloorRepository floors,
            EventPackageRepository packages,
            AppSettingsService appSettingsService,
            ClientPaymentRepository payments) {
        this.events = events;
        this.clients = clients;
        this.floors = floors;
        this.packages = packages;
        this.appSettingsService = appSettingsService;
        this.payments = payments;
    }

    @Transactional
    public Event create(CreateEventRequest request) {
        validateEventTime(request.startTime(), request.endTime());
        Client client = clients.findById(request.clientId())
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado"));
        Floor floor = floors.findById(request.floorId())
                .orElseThrow(() -> new EntityNotFoundException("Piso no encontrado"));
        EventPackage eventPackage = null;
        if (request.packageId() != null) {
            eventPackage = packages.findById(request.packageId())
                    .orElseThrow(() -> new EntityNotFoundException("Paquete no encontrado"));
        }

        Event event = new Event();
        event.setClient(client);
        event.setFloor(floor);
        event.setEventPackage(eventPackage);
        event.setTitle(request.title());
        event.setEventType(request.eventType());
        event.setEventDate(request.eventDate());
        event.setStartTime(request.startTime());
        event.setEndTime(request.endTime());
        event.setStatus(EventStatus.INQUIRY);
        event.setTotalAmount(request.totalAmount());
        event.setApdaycAmount(request.apdaycAmount());
        if (request.contractCapacityOverride() != null && request.contractCapacityOverride() > 0) {
            event.setContractCapacityOverride(request.contractCapacityOverride());
        }
        event.setApdaycPayer(request.apdaycPayer());
        event.setApdaycStatus(request.apdaycStatus());
        event.setApdaycNotes(request.apdaycNotes());
        event.setNotes(request.notes());
        return events.save(event);
    }

    @Transactional
    public Event update(UUID id, UpdateEventRequest request) {
        Event event = get(id);
        validateEventTime(request.startTime(), request.endTime());
        boolean willReserve = shouldReserveSchedule(deriveStatus(event, payments.sumEventPayments(event.getId())));
        boolean sameSchedule = event.getEventDate().equals(request.eventDate())
                && event.getStartTime().equals(request.startTime())
                && event.getEndTime().equals(request.endTime());
        if (willReserve && !sameSchedule
                && hasScheduleConflict(event.getId(), event.getFloor().getId(), request.eventDate(), request.startTime(), request.endTime())) {
            throw new IllegalArgumentException("El ambiente ya tiene una reserva que cruza con esa fecha y horario.");
        }

        event.setTitle(request.title());
        event.setEventType(request.eventType());
        event.setEventDate(request.eventDate());
        event.setStartTime(request.startTime());
        event.setEndTime(request.endTime());
        event.setTotalAmount(request.totalAmount());
        event.setApdaycAmount(request.apdaycAmount());
        event.setApdaycPayer(request.apdaycPayer());
        event.setApdaycStatus(request.apdaycStatus());
        event.setApdaycNotes(request.apdaycNotes());
        event.setContractCapacityOverride(request.contractCapacityOverride());
        event.setNotes(request.notes());
        return refreshStatus(events.save(event));
    }

    @Transactional
    public Event cancel(UUID id, CancelEventRequest request) {
        Event event = get(id);
        LocalDate requestedAt = request != null && request.requestedAt() != null ? request.requestedAt() : LocalDate.now();
        LocalDate cancellationDate = request != null && request.cancellationDate() != null ? request.cancellationDate() : requestedAt;
        CancellationType cancellationType = request != null && request.cancellationType() != null
                ? request.cancellationType()
                : CancellationType.CLIENT_REQUEST;
        long noticeDaysRaw = ChronoUnit.DAYS.between(requestedAt, event.getEventDate());
        int noticeDays = Math.max(0, (int) noticeDaysRaw);
        BigDecimal advanceAmount = payments.sumEventPayments(event.getId()).setScale(2, RoundingMode.HALF_UP);
        CancellationPaymentStatus paymentStatus = request != null && request.cancellationPaymentStatus() != null
                ? request.cancellationPaymentStatus()
                : defaultCancellationPaymentStatus(advanceAmount);
        BigDecimal refundedAmount = request != null && request.refundedAmount() != null
                ? request.refundedAmount().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        validateCancellationPaymentStatus(advanceAmount, paymentStatus);
        BigDecimal retainedAmount = cancellationRetainedAmount(advanceAmount, refundedAmount, paymentStatus);
        event.setStatus(EventStatus.CANCELLED);
        event.setCancellationType(cancellationType);
        event.setCancellationRequestedAt(requestedAt);
        event.setCancellationNoticeDays(noticeDays);
        event.setRetainedAdvanceAmount(retainedAmount);
        event.setCancellationNotes(request != null ? request.cancellationNotes() : null);
        event.setCancellationAdvanceAmount(advanceAmount);
        event.setCancellationRetainedAmount(retainedAmount);
        event.setCancellationRefundedAmount(cancellationRefundedAmount(advanceAmount, refundedAmount, paymentStatus));
        event.setCancellationPaymentStatus(paymentStatus);
        event.setCancellationReason(request != null ? request.cancellationReason() : null);
        event.setCancellationDate(cancellationDate);
        event.setCancellationObservation(request != null ? request.cancellationObservation() : null);
        return events.save(event);
    }

    @Transactional
    public Event reschedule(UUID id, RescheduleEventRequest request) {
        Event event = get(id);
        LocalDate today = LocalDate.now();
        int minNoticeDays = appSettingsService.rescheduleMinNoticeDays();
        int maxRescheduleMonths = appSettingsService.rescheduleMaxMonths();
        LocalDate noticeLimitDate = event.getEventDate().minusDays(minNoticeDays);
        LocalDate maxRescheduleDate = event.getEventDate().plusMonths(maxRescheduleMonths);
        if (today.isAfter(noticeLimitDate)) {
            throw new IllegalArgumentException(
                    "Solo se puede reprogramar con al menos " + minNoticeDays + " dias de anticipacion.");
        }
        if (request.eventDate().isAfter(maxRescheduleDate)) {
            throw new IllegalArgumentException(
                    "La nueva fecha excede el limite de "
                            + maxRescheduleMonths
                            + " meses desde la fecha original.");
        }
        if (request.eventDate().isBefore(today)) {
            throw new IllegalArgumentException("La nueva fecha no puede ser menor a hoy.");
        }
        validateEventTime(request.startTime(), request.endTime());
        if (hasScheduleConflict(event.getId(), event.getFloor().getId(), request.eventDate(), request.startTime(), request.endTime())) {
            throw new IllegalArgumentException("El ambiente ya tiene una reserva que cruza con esa fecha y horario.");
        }
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new IllegalArgumentException("No se puede reprogramar un evento cancelado.");
        }
        if (!event.isRescheduled()) {
            event.setOriginalEventDate(event.getEventDate());
            event.setOriginalStartTime(event.getStartTime());
            event.setOriginalEndTime(event.getEndTime());
        }
        event.setEventDate(request.eventDate());
        event.setStartTime(request.startTime());
        event.setEndTime(request.endTime());
        event.setRescheduled(true);
        return events.save(event);
    }

    @Transactional(readOnly = true)
    public RescheduleOptionsResponse rescheduleOptions(UUID id) {
        Event event = get(id);
        LocalDate today = LocalDate.now();
        LocalDate maxRescheduleDate = event.getEventDate().plusMonths(appSettingsService.rescheduleMaxMonths());
        List<RescheduleOptionEvent> scheduled = events
                .findScheduleCandidates(event.getFloor().getId(), today, maxRescheduleDate)
                .stream()
                .filter(item -> !item.getId().equals(event.getId()))
                .map(RescheduleOptionEvent::from)
                .toList();
        return new RescheduleOptionsResponse(
                event.getId(),
                event.getEventDate(),
                today,
                maxRescheduleDate,
                event.getFloor().getName(),
                scheduled);
    }

    private void validateEventTime(LocalTime startTime, LocalTime endTime) {
        if (startTime.equals(endTime)) {
            throw new IllegalArgumentException("La hora de inicio y fin no pueden ser iguales.");
        }
    }

    private boolean hasScheduleConflict(CreateEventRequest request) {
        return hasScheduleConflict(
                null,
                request.floorId(),
                request.eventDate(),
                request.startTime(),
                request.endTime());
    }

    private boolean hasScheduleConflict(UUID currentEventId, UUID floorId, LocalDate eventDate, LocalTime startTime, LocalTime endTime) {
        int newStart = minutesOfDay(startTime);
        int newEnd = normalizeEnd(newStart, endTime);

        return events.findScheduleCandidates(
                        floorId,
                        eventDate.minusDays(1),
                        eventDate.plusDays(1))
                .stream()
                .filter(existing -> currentEventId == null || !existing.getId().equals(currentEventId))
                .anyMatch(existing -> overlaps(eventDate, newStart, newEnd, existing));
    }

    private boolean overlaps(LocalDate requestedDate, int newStart, int newEnd, Event existing) {
        long dayOffset = ChronoUnit.DAYS.between(requestedDate, existing.getEventDate());
        int existingStart = (int) dayOffset * 1440 + minutesOfDay(existing.getStartTime());
        int existingEnd = normalizeEnd(existingStart, existing.getEndTime());
        return newStart < existingEnd && existingStart < newEnd;
    }

    @Transactional(readOnly = true)
    public BigDecimal paidAmount(UUID eventId) {
        return payments.sumEventPayments(eventId);
    }

    @Transactional
    public Event refreshStatus(Event event) {
        if (event.getStatus() == EventStatus.CANCELLED) {
            return event;
        }
        event.setStatus(deriveStatus(event, payments.sumEventPayments(event.getId())));
        return events.save(event);
    }

    private EventStatus deriveStatus(Event event, BigDecimal paidAmount) {
        BigDecimal paid = paidAmount == null ? BigDecimal.ZERO : paidAmount;
        BigDecimal total = event.getTotalAmount() == null ? BigDecimal.ZERO : event.getTotalAmount();
        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            return EventStatus.INQUIRY;
        }
        if (total.compareTo(BigDecimal.ZERO) > 0 && paid.compareTo(total) >= 0) {
            return EventStatus.CONTRACTED;
        }
        return EventStatus.SEPARATED;
    }

    private boolean shouldReserveSchedule(EventStatus status) {
        return status == EventStatus.SEPARATED || status == EventStatus.CONTRACTED;
    }

    private CancellationPaymentStatus defaultCancellationPaymentStatus(BigDecimal advanceAmount) {
        return advanceAmount.compareTo(BigDecimal.ZERO) > 0
                ? CancellationPaymentStatus.ADELANTO_RETENIDO
                : CancellationPaymentStatus.SIN_ADELANTO;
    }

    private BigDecimal cancellationRetainedAmount(
            BigDecimal advanceAmount,
            BigDecimal refundedAmount,
            CancellationPaymentStatus paymentStatus) {
        return switch (paymentStatus) {
            case SIN_ADELANTO, DEVOLUCION_TOTAL -> BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            case ADELANTO_RETENIDO -> advanceAmount.setScale(2, RoundingMode.HALF_UP);
            case DEVOLUCION_PARCIAL -> advanceAmount.subtract(refundedAmount).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        };
    }

    private void validateCancellationPaymentStatus(BigDecimal advanceAmount, CancellationPaymentStatus paymentStatus) {
        boolean hasAdvance = advanceAmount.compareTo(BigDecimal.ZERO) > 0;
        if (!hasAdvance && paymentStatus != CancellationPaymentStatus.SIN_ADELANTO) {
            throw new IllegalArgumentException("No hay adelanto registrado para aplicar retencion o devolucion.");
        }
        if (hasAdvance && paymentStatus == CancellationPaymentStatus.SIN_ADELANTO) {
            throw new IllegalArgumentException("El evento tiene adelanto registrado; selecciona retencion o devolucion.");
        }
    }

    private BigDecimal cancellationRefundedAmount(
            BigDecimal advanceAmount,
            BigDecimal refundedAmount,
            CancellationPaymentStatus paymentStatus) {
        return switch (paymentStatus) {
            case SIN_ADELANTO, ADELANTO_RETENIDO -> BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            case DEVOLUCION_TOTAL -> advanceAmount.setScale(2, RoundingMode.HALF_UP);
            case DEVOLUCION_PARCIAL -> {
                if (refundedAmount.compareTo(BigDecimal.ZERO) <= 0 || refundedAmount.compareTo(advanceAmount) >= 0) {
                    throw new IllegalArgumentException("La devolucion parcial debe ser mayor a 0 y menor al adelanto recibido.");
                }
                yield refundedAmount.setScale(2, RoundingMode.HALF_UP);
            }
        };
    }

    private int minutesOfDay(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }

    private int normalizeEnd(int startMinutes, LocalTime endTime) {
        int endMinutes = minutesOfDay(endTime);
        if (endMinutes <= startMinutes % 1440) {
            endMinutes += 1440;
        }
        return (startMinutes / 1440) * 1440 + endMinutes;
    }

    @Transactional(readOnly = true)
    public List<Event> listUpcoming() {
        return events.findAllWithDetailsOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Event get(UUID id) {
        return events.findDetailedById(id).orElseThrow(() -> new EntityNotFoundException("Evento no encontrado"));
    }
}
