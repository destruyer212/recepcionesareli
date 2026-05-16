package com.areli.api.repository;

import com.areli.api.domain.Event;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, UUID> {
    List<Event> findByEventDateBetweenOrderByEventDateAscStartTimeAsc(LocalDate from, LocalDate to);

    @Query("""
            select e
            from Event e
            join fetch e.client
            join fetch e.floor
            left join fetch e.eventPackage
            order by e.createdAt desc
            """)
    List<Event> findAllWithDetailsOrderByCreatedAtDesc();

    @Query("""
            select e
            from Event e
            join fetch e.client
            join fetch e.floor
            left join fetch e.eventPackage
            where e.id = :id
            """)
    java.util.Optional<Event> findDetailedById(@Param("id") UUID id);

    @Query("""
            select e
            from Event e
            join fetch e.client
            join fetch e.floor
            left join fetch e.eventPackage
            where e.eventDate between :from and :to
            order by e.eventDate asc, e.startTime asc
            """)
    List<Event> findUpcomingWithDetails(@Param("from") LocalDate from, @Param("to") LocalDate to);

    long countByEventDateBetween(LocalDate from, LocalDate to);

    @Query("select coalesce(sum(e.totalAmount), 0) from Event e where e.status = com.areli.api.domain.Enums.EventStatus.CONTRACTED")
    java.math.BigDecimal sumTotalContracted();

    @Query("select coalesce(sum(e.cancellationRefundedAmount), 0) from Event e")
    java.math.BigDecimal sumCancellationRefunded();

    @Query("""
            select e.floor.name, count(e)
            from Event e
            group by e.floor.name
            order by e.floor.name
            """)
    List<Object[]> countEventsByFloor();

    @Query("""
            select e
            from Event e
            where e.floor.id = :floorId
              and e.eventDate between :from and :to
              and e.status in (
                  com.areli.api.domain.Enums.EventStatus.SEPARATED,
                  com.areli.api.domain.Enums.EventStatus.CONTRACTED
              )
            order by e.eventDate asc, e.startTime asc
            """)
    List<Event> findScheduleCandidates(
            @Param("floorId") UUID floorId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
