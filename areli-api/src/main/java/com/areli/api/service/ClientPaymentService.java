package com.areli.api.service;

import com.areli.api.domain.Event;
import com.areli.api.domain.Enums.EventStatus;
import com.areli.api.domain.Enums.PaymentType;
import com.areli.api.domain.PaymentAndOperations.ClientPayment;
import com.areli.api.repository.ClientPaymentRepository;
import com.areli.api.repository.EventRepository;
import com.areli.api.web.dto.ApiDtos.ClientPaymentRequest;
import com.areli.api.web.dto.ApiDtos.UpdateClientPaymentRequest;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientPaymentService {
    private final ClientPaymentRepository payments;
    private final EventRepository events;

    public ClientPaymentService(ClientPaymentRepository payments, EventRepository events) {
        this.payments = payments;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<ClientPayment> list(UUID eventId) {
        ensureEventExists(eventId);
        return payments.findByEvent_IdOrderByPaymentDateAscCreatedAtAsc(eventId);
    }

    @Transactional
    public ClientPayment create(UUID eventId, ClientPaymentRequest request) {
        Event event = events.findDetailedById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Evento no encontrado"));
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new IllegalArgumentException("No se pueden registrar pagos en un evento cancelado.");
        }

        PaymentType paymentType = request.paymentType() == null ? PaymentType.EVENT_PAYMENT : request.paymentType();
        String method = cleanText(request.method());
        String operationNumber = blankToNull(request.operationNumber());
        validatePaymentMethod(method, operationNumber);

        ClientPayment payment = new ClientPayment();
        payment.setEvent(event);
        payment.setPaymentDate(request.paymentDate());
        payment.setConcept(cleanText(request.concept()));
        payment.setAmount(request.amount());
        payment.setMethod(method);
        payment.setPaymentType(paymentType);
        payment.setCountsTowardsEventTotal(paymentType == PaymentType.EVENT_PAYMENT);
        payment.setOperationNumber(operationNumber);
        payment.setInternalReceiptNumber(blankToNull(request.internalReceiptNumber()));
        payment.setNotes(blankToNull(request.notes()));

        if (payment.isCountsTowardsEventTotal()
                && payments.sumEventPayments(event.getId()).compareTo(BigDecimal.ZERO) <= 0
                && request.amount().compareTo(BigDecimal.ZERO) > 0
                && hasScheduleConflict(event)) {
            throw new IllegalArgumentException("No se puede separar: el ambiente ya tiene una reserva que cruza con esa fecha y horario.");
        }

        ClientPayment saved = payments.save(payment);
        refreshEventStatus(event);
        return saved;
    }

    @Transactional
    public ClientPayment update(UUID eventId, UUID paymentId, UpdateClientPaymentRequest request) {
        ensureEventExists(eventId);
        ClientPayment payment = payments.findByIdAndEvent_Id(paymentId, eventId)
                .orElseThrow(() -> new EntityNotFoundException("Pago no encontrado"));
        if (payment.getEvent().getStatus() == EventStatus.CANCELLED) {
            throw new IllegalArgumentException("No se pueden editar pagos de un evento cancelado.");
        }

        String operationNumber = request.operationNumber() != null
                ? blankToNull(request.operationNumber())
                : payment.getOperationNumber();
        validatePaymentMethod(payment.getMethod(), operationNumber);

        if (request.operationNumber() != null) {
            payment.setOperationNumber(operationNumber);
        }
        if (request.internalReceiptNumber() != null) {
            payment.setInternalReceiptNumber(blankToNull(request.internalReceiptNumber()));
        }
        if (request.notes() != null) {
            payment.setNotes(blankToNull(request.notes()));
        }

        return payments.save(payment);
    }

    @Transactional(readOnly = true)
    public BigDecimal eventPaidAmount(UUID eventId) {
        return payments.sumEventPayments(eventId);
    }

    @Transactional
    public Event refreshEventStatus(Event event) {
        if (event.getStatus() == EventStatus.CANCELLED) {
            return event;
        }
        BigDecimal paid = payments.sumEventPayments(event.getId());
        BigDecimal total = event.getTotalAmount() == null ? BigDecimal.ZERO : event.getTotalAmount();
        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            event.setStatus(EventStatus.INQUIRY);
        } else if (total.compareTo(BigDecimal.ZERO) > 0 && paid.compareTo(total) >= 0) {
            event.setStatus(EventStatus.CONTRACTED);
        } else {
            event.setStatus(EventStatus.SEPARATED);
        }
        return events.save(event);
    }

    private void ensureEventExists(UUID eventId) {
        if (!events.existsById(eventId)) {
            throw new EntityNotFoundException("Evento no encontrado");
        }
    }

    private String cleanText(String value) {
        return value == null ? "" : value.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validatePaymentMethod(String method, String operationNumber) {
        if (requiresOperationNumber(method) && operationNumber == null) {
            throw new IllegalArgumentException("Ingresa el número de operación para pagos por " + method + ".");
        }
        if (!requiresOperationNumber(method) && operationNumber != null) {
            throw new IllegalArgumentException("El número de operación solo aplica a BCP, BBVA o Scotiabank.");
        }
    }

    private boolean requiresOperationNumber(String method) {
        return "BCP".equalsIgnoreCase(method)
                || "BBVA".equalsIgnoreCase(method)
                || "Scotiabank".equalsIgnoreCase(method);
    }

    private boolean hasScheduleConflict(Event event) {
        int newStart = minutesOfDay(event.getStartTime());
        int newEnd = normalizeEnd(newStart, event.getEndTime());
        return events.findScheduleCandidates(
                        event.getFloor().getId(),
                        event.getEventDate().minusDays(1),
                        event.getEventDate().plusDays(1))
                .stream()
                .filter(existing -> !existing.getId().equals(event.getId()))
                .anyMatch(existing -> overlaps(event.getEventDate(), newStart, newEnd, existing));
    }

    private boolean overlaps(LocalDate requestedDate, int newStart, int newEnd, Event existing) {
        long dayOffset = ChronoUnit.DAYS.between(requestedDate, existing.getEventDate());
        int existingStart = (int) dayOffset * 1440 + minutesOfDay(existing.getStartTime());
        int existingEnd = normalizeEnd(existingStart, existing.getEndTime());
        return newStart < existingEnd && existingStart < newEnd;
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
}
