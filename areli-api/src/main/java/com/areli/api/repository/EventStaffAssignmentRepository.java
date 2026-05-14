package com.areli.api.repository;

import com.areli.api.domain.PaymentAndOperations.EventStaffAssignment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventStaffAssignmentRepository extends JpaRepository<EventStaffAssignment, UUID> {
    @Query("""
            select assignment
            from EventStaffAssignment assignment
            join fetch assignment.event event
            join fetch assignment.staffMember staff
            where event.id = :eventId
              and assignment.active = true
            order by assignment.roleKey asc, assignment.slotNumber asc, staff.fullName asc
            """)
    List<EventStaffAssignment> findActiveByEventId(@Param("eventId") UUID eventId);

    @Query("""
            select assignment
            from EventStaffAssignment assignment
            join fetch assignment.event event
            join fetch event.floor floor
            join fetch assignment.staffMember staff
            where staff.id = :staffMemberId
              and assignment.active = true
            order by event.eventDate asc, event.startTime asc
            """)
    List<EventStaffAssignment> findActiveByStaffMemberId(@Param("staffMemberId") UUID staffMemberId);

    @Query("""
            select assignment
            from EventStaffAssignment assignment
            join fetch assignment.event event
            join fetch assignment.staffMember staff
            where event.id = :eventId
              and assignment.roleKey = :roleKey
              and assignment.active = true
              and ((:slotNumber is null and assignment.slotNumber is null) or assignment.slotNumber = :slotNumber)
            """)
    Optional<EventStaffAssignment> findActiveSlot(
            @Param("eventId") UUID eventId,
            @Param("roleKey") String roleKey,
            @Param("slotNumber") Integer slotNumber);

    @Query("""
            select assignment
            from EventStaffAssignment assignment
            join fetch assignment.event event
            join fetch assignment.staffMember staff
            where event.id = :eventId
              and staff.id = :staffMemberId
              and assignment.active = true
            """)
    Optional<EventStaffAssignment> findActiveByEventAndStaff(
            @Param("eventId") UUID eventId,
            @Param("staffMemberId") UUID staffMemberId);

    @Query("""
            select assignment
            from EventStaffAssignment assignment
            join fetch assignment.event event
            where assignment.id = :assignmentId
              and event.id = :eventId
              and assignment.active = true
            """)
    Optional<EventStaffAssignment> findActiveByEventAndId(
            @Param("eventId") UUID eventId,
            @Param("assignmentId") UUID assignmentId);
}
