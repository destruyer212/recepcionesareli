package com.areli.api.service;

import com.areli.api.domain.Enums.EventStatus;
import com.areli.api.domain.Event;
import com.areli.api.domain.PaymentAndOperations.EventStaffAssignment;
import com.areli.api.domain.PaymentAndOperations.StaffMember;
import com.areli.api.repository.EventRepository;
import com.areli.api.repository.EventStaffAssignmentRepository;
import com.areli.api.repository.StaffMemberRepository;
import com.areli.api.web.dto.EventStaffDtos.EventStaffAssignmentRequest;
import com.areli.api.web.dto.EventStaffDtos.StaffAvailabilityResponse;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventStaffAssignmentService {
    private static final String MOZOS_ROLE = "MOZOS";
    private static final Pattern MOZO_CATEGORY_PATTERN = Pattern.compile("MOZO_\\d+");
    private static final Map<String, String> ROLE_LABELS = Map.ofEntries(
            Map.entry("EVENT_PLANNER", "Event Planner"),
            Map.entry("COORDINADOR_EVENTO", "Coordinador del Evento"),
            Map.entry("DJ", "DJ"),
            Map.entry("FOTOGRAFO", "Fotografo"),
            Map.entry("VIDEOGRAFO", "Videografo"),
            Map.entry("SEGURIDAD", "Seguridad"),
            Map.entry("ANFITRIONA", "Anfitriona"),
            Map.entry(MOZOS_ROLE, "Mozos"),
            Map.entry("BARMAN", "Barman"),
            Map.entry("HORA_LOCA", "Hora Loca"),
            Map.entry("DECORACION", "Personal de Decoracion"),
            Map.entry("BOCADITOS", "Personal de Bocaditos"),
            Map.entry("COCINA", "Personal de Cocina"),
            Map.entry("LIMPIEZA", "Personal de Limpieza"),
            Map.entry("APOYO", "Personal de Apoyo"));

    private final EventRepository events;
    private final StaffMemberRepository staffMembers;
    private final EventStaffAssignmentRepository assignments;

    public EventStaffAssignmentService(
            EventRepository events,
            StaffMemberRepository staffMembers,
            EventStaffAssignmentRepository assignments) {
        this.events = events;
        this.staffMembers = staffMembers;
        this.assignments = assignments;
    }

    @Transactional(readOnly = true)
    public List<EventStaffAssignment> list(UUID eventId) {
        ensureEventExists(eventId);
        return assignments.findActiveByEventId(eventId);
    }

    @Transactional(readOnly = true)
    public List<StaffAvailabilityResponse> availability(UUID eventId, String requestedRoleKey) {
        Event event = getEvent(eventId);
        String roleKey = normalizeRoleKey(requestedRoleKey);
        List<UUID> alreadyAssignedStaff = assignments.findActiveByEventId(eventId).stream()
                .map(assignment -> assignment.getStaffMember().getId())
                .toList();

        return staffMembers.findActiveOrderByRoleAndFullName().stream()
                .filter(staff -> isCompatibleRole(roleKey, staff.getRole()))
                .map(staff -> availabilityFor(event, staff, alreadyAssignedStaff))
                .sorted(Comparator
                        .<StaffAvailabilityResponse, Boolean>comparing(StaffAvailabilityResponse::available).reversed()
                        .thenComparing(StaffAvailabilityResponse::staffName))
                .toList();
    }

    @Transactional
    public EventStaffAssignment assign(UUID eventId, EventStaffAssignmentRequest request) {
        Event event = getEvent(eventId);
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new IllegalArgumentException("No se puede asignar personal a un evento anulado.");
        }

        StaffMember staff = staffMembers.findById(request.staffMemberId())
                .orElseThrow(() -> new EntityNotFoundException("Trabajador no encontrado"));
        if (!staff.isActive()) {
            throw new IllegalArgumentException("El trabajador seleccionado no esta activo.");
        }

        String roleKey = normalizeRoleKey(request.roleKey());
        if (!isCompatibleRole(roleKey, staff.getRole())) {
            throw new IllegalArgumentException("El trabajador no pertenece al cargo seleccionado.");
        }

        Integer slotNumber = resolveSlotNumber(eventId, roleKey, request.slotNumber());
        Optional<EventStaffAssignment> existingSlot = assignments.findActiveSlot(eventId, roleKey, slotNumber);
        Optional<EventStaffAssignment> existingStaff = assignments.findActiveByEventAndStaff(eventId, staff.getId());
        if (existingStaff.isPresent()
                && (existingSlot.isEmpty() || !existingStaff.get().getId().equals(existingSlot.get().getId()))) {
            throw new IllegalArgumentException("Este trabajador ya esta asignado a este evento.");
        }

        Optional<Event> conflict = findScheduleConflict(event, staff.getId());
        if (conflict.isPresent()) {
            Event conflictEvent = conflict.get();
            throw new IllegalArgumentException(
                    "Este trabajador ya esta asignado en ese horario: "
                            + conflictEvent.getTitle()
                            + " ("
                            + conflictEvent.getEventDate()
                            + " "
                            + conflictEvent.getStartTime()
                            + "-"
                            + conflictEvent.getEndTime()
                            + ").");
        }

        EventStaffAssignment assignment = existingSlot.orElseGet(EventStaffAssignment::new);
        assignment.setEvent(event);
        assignment.setStaffMember(staff);
        assignment.setRole(roleKey);
        assignment.setRoleKey(roleKey);
        assignment.setRoleLabel(labelFor(roleKey, slotNumber, request.roleLabel()));
        assignment.setSlotNumber(slotNumber);
        assignment.setNotes(clean(request.notes()));
        assignment.setActive(true);
        return assignments.save(assignment);
    }

    @Transactional
    public void remove(UUID eventId, UUID assignmentId) {
        EventStaffAssignment assignment = assignments.findActiveByEventAndId(eventId, assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Asignacion no encontrada"));
        assignment.setActive(false);
        assignments.save(assignment);
    }

    private StaffAvailabilityResponse availabilityFor(Event targetEvent, StaffMember staff, List<UUID> alreadyAssignedStaff) {
        if (alreadyAssignedStaff.contains(staff.getId())) {
            return StaffAvailabilityResponse.unavailable(staff, "Ya esta asignado a este evento.", null);
        }
        return findScheduleConflict(targetEvent, staff.getId())
                .map(conflict -> StaffAvailabilityResponse.unavailable(staff, "Cruza con otro evento.", conflict))
                .orElseGet(() -> StaffAvailabilityResponse.available(staff));
    }

    private Optional<Event> findScheduleConflict(Event targetEvent, UUID staffMemberId) {
        return assignments.findActiveByStaffMemberId(staffMemberId).stream()
                .map(EventStaffAssignment::getEvent)
                .filter(existing -> !existing.getId().equals(targetEvent.getId()))
                .filter(existing -> existing.getStatus() != EventStatus.CANCELLED)
                .filter(existing -> overlaps(targetEvent, existing))
                .findFirst();
    }

    private boolean overlaps(Event targetEvent, Event existingEvent) {
        LocalDateTime targetStart = targetEvent.getEventDate().atTime(targetEvent.getStartTime());
        LocalDateTime targetEnd = targetEvent.getEventDate().atTime(targetEvent.getEndTime());
        LocalDateTime existingStart = existingEvent.getEventDate().atTime(existingEvent.getStartTime());
        LocalDateTime existingEnd = existingEvent.getEventDate().atTime(existingEvent.getEndTime());
        if (!targetEnd.isAfter(targetStart)) {
            targetEnd = targetEnd.plusDays(1);
        }
        if (!existingEnd.isAfter(existingStart)) {
            existingEnd = existingEnd.plusDays(1);
        }
        return targetStart.isBefore(existingEnd) && existingStart.isBefore(targetEnd);
    }

    private Integer resolveSlotNumber(UUID eventId, String roleKey, Integer requestedSlot) {
        if (!MOZOS_ROLE.equals(roleKey)) {
            return null;
        }
        if (requestedSlot != null && requestedSlot > 0) {
            return requestedSlot;
        }
        return assignments.findActiveByEventId(eventId).stream()
                .filter(assignment -> MOZOS_ROLE.equals(assignment.getRoleKey()))
                .map(EventStaffAssignment::getSlotNumber)
                .filter(slot -> slot != null && slot > 0)
                .max(Integer::compareTo)
                .orElse(0) + 1;
    }

    private String labelFor(String roleKey, Integer slotNumber, String requestedLabel) {
        if (MOZOS_ROLE.equals(roleKey) && slotNumber != null) {
            return "Mozo " + slotNumber;
        }
        String cleanLabel = clean(requestedLabel);
        if (cleanLabel != null) {
            return cleanLabel;
        }
        return ROLE_LABELS.get(roleKey);
    }

    private String normalizeRoleKey(String value) {
        String roleKey = clean(value);
        if (roleKey == null) {
            throw new IllegalArgumentException("Selecciona el cargo del equipo.");
        }
        roleKey = roleKey.toUpperCase();
        if (MOZO_CATEGORY_PATTERN.matcher(roleKey).matches() || "MOZO".equals(roleKey)) {
            return MOZOS_ROLE;
        }
        if (!ROLE_LABELS.containsKey(roleKey)) {
            throw new IllegalArgumentException("Cargo de equipo no valido: " + roleKey);
        }
        return roleKey;
    }

    private boolean isCompatibleRole(String assignmentRoleKey, String workerRole) {
        if (workerRole == null) {
            return false;
        }
        String normalizedWorkerRole = workerRole.trim().toUpperCase();
        if (MOZOS_ROLE.equals(assignmentRoleKey)) {
            return MOZO_CATEGORY_PATTERN.matcher(normalizedWorkerRole).matches();
        }
        return assignmentRoleKey.equals(normalizedWorkerRole);
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private void ensureEventExists(UUID eventId) {
        getEvent(eventId);
    }

    private Event getEvent(UUID eventId) {
        return events.findDetailedById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Evento no encontrado"));
    }
}
