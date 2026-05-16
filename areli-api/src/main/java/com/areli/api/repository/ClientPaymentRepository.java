package com.areli.api.repository;

import com.areli.api.domain.PaymentAndOperations.ClientPayment;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClientPaymentRepository extends JpaRepository<ClientPayment, UUID> {
    List<ClientPayment> findByEvent_IdOrderByPaymentDateAscCreatedAtAsc(UUID eventId);

    Optional<ClientPayment> findByIdAndEvent_Id(UUID id, UUID eventId);

    @Query("""
            select coalesce(sum(p.amount), 0)
            from ClientPayment p
            where p.event.id = :eventId
              and p.countsTowardsEventTotal = true
            """)
    BigDecimal sumEventPayments(@Param("eventId") UUID eventId);

    @Query("""
            select coalesce(sum(p.amount), 0)
            from ClientPayment p
            where p.countsTowardsEventTotal = true
            """)
    BigDecimal sumAllEventPayments();
}
