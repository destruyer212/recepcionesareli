package com.areli.api.web.dto;

import com.areli.api.domain.Client;
import com.areli.api.domain.Event;
import com.areli.api.domain.EventPackage;
import com.areli.api.domain.Floor;
import com.areli.api.domain.Enums.CancellationType;
import com.areli.api.domain.Enums.CancellationPaymentStatus;
import com.areli.api.domain.Enums.DocumentType;
import com.areli.api.domain.Enums.EventStatus;
import com.areli.api.domain.Enums.FloorStatus;
import com.areli.api.domain.Enums.PaymentType;
import com.areli.api.domain.PaymentAndOperations.ClientPayment;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.LocalTime;
import java.util.UUID;

public final class ApiDtos {
    private ApiDtos() {
    }

    public record ClientRequest(
            @NotBlank String fullName,
            DocumentType documentType,
            String documentNumber,
            String phone,
            String whatsapp,
            String email,
            String address,
            String province,
            String district,
            String provinceUbigeo,
            String districtUbigeo,
            String notes
    ) {
        public ClientRequest {
            if (documentType != null) {
                if (documentNumber == null || documentNumber.isBlank()) {
                    throw new IllegalArgumentException("El número de documento es obligatorio.");
                }
                String digitsOnly = documentNumber.replaceAll("\\D", "");
                int expectedLength = documentType == DocumentType.DNI ? 8 : 11;
                if (digitsOnly.length() != expectedLength) {
                    throw new IllegalArgumentException(
                            documentType == DocumentType.DNI
                                    ? "El DNI debe tener 8 dígitos."
                                    : "El RUC debe tener 11 dígitos.");
                }
                documentNumber = digitsOnly;
            }
        }

        public Client toEntity() {
            Client client = new Client();
            client.setFullName(fullName);
            client.setDocumentType(documentType);
            client.setDocumentNumber(documentNumber);
            client.setPhone(phone);
            client.setWhatsapp(whatsapp);
            client.setEmail(email);
            client.setAddress(address);
            client.setProvince(province);
            client.setDistrict(district);
            client.setProvinceUbigeo(provinceUbigeo);
            client.setDistrictUbigeo(districtUbigeo);
            client.setNotes(notes);
            return client;
        }
    }

    public record ClientResponse(UUID id, String fullName, DocumentType documentType, String documentNumber, String phone, String whatsapp, String email, String address, String province, String district, String provinceUbigeo, String districtUbigeo, String notes) {
        public static ClientResponse from(Client client) {
            return new ClientResponse(
                    client.getId(),
                    client.getFullName(),
                    client.getDocumentType(),
                    client.getDocumentNumber(),
                    client.getPhone(),
                    client.getWhatsapp(),
                    client.getEmail(),
                    client.getAddress(),
                    client.getProvince(),
                    client.getDistrict(),
                    client.getProvinceUbigeo(),
                    client.getDistrictUbigeo(),
                    client.getNotes());
        }
    }

    public record PeruProvinceResponse(String ubigeo, String name, String departmentUbigeo, String departmentName) {
    }

    public record PeruDistrictResponse(String ubigeo, String name, String provinceUbigeo, String provinceName, String departmentUbigeo, String departmentName) {
    }

    public record PeruLocationsResponse(
            java.util.List<PeruProvinceResponse> provinces,
            java.util.List<PeruDistrictResponse> districts
    ) {
    }

    public record ClientLookupResponse(
            DocumentType documentType,
            String documentNumber,
            String fullName,
            String address
    ) {
    }

    public record IdName(UUID id, String name) {
    }

    public record FloorResponse(UUID id, String name, Integer levelNumber, Integer capacity, BigDecimal areaM2, FloorStatus status, String description) {
        public static FloorResponse from(Floor floor) {
            return new FloorResponse(floor.getId(), floor.getName(), floor.getLevelNumber(), floor.getCapacity(), floor.getAreaM2(), floor.getStatus(), floor.getDescription());
        }
    }

    public record PackageRequest(
            @NotBlank String name,
            String eventType,
            @NotNull @DecimalMin("0.00") BigDecimal basePrice,
            Integer includedCapacity,
            BigDecimal guaranteeAmount,
            String includedServices,
            String terms,
            Boolean active
    ) {
    }

    public record PackageResponse(UUID id, String name, String eventType, BigDecimal basePrice, Integer includedCapacity, BigDecimal guaranteeAmount, String includedServices, String terms, boolean active) {
        public static PackageResponse from(EventPackage eventPackage) {
            return new PackageResponse(
                    eventPackage.getId(),
                    eventPackage.getName(),
                    eventPackage.getEventType(),
                    eventPackage.getBasePrice(),
                    eventPackage.getIncludedCapacity(),
                    eventPackage.getGuaranteeAmount(),
                    eventPackage.getIncludedServices(),
                    eventPackage.getTerms(),
                    eventPackage.isActive());
        }
    }

    public record EventResponse(
            UUID id,
            UUID clientId,
            UUID packageId,
            String clientName,
            String floorName,
            String packageName,
            String title,
            String eventType,
            LocalDate eventDate,
            LocalTime startTime,
            LocalTime endTime,
            EventStatus status,
            BigDecimal totalAmount,
            BigDecimal apdaycAmount,
            String apdaycPayer,
            String apdaycStatus,
            String apdaycNotes,
            String packageIncludedServices,
            String packageTerms,
            CancellationType cancellationType,
            LocalDate cancellationRequestedAt,
            Integer cancellationNoticeDays,
            BigDecimal retainedAdvanceAmount,
            String cancellationNotes,
            BigDecimal paidAmount,
            BigDecimal balanceAmount,
            BigDecimal cancellationAdvanceAmount,
            BigDecimal cancellationRetainedAmount,
            BigDecimal cancellationRefundedAmount,
            CancellationPaymentStatus cancellationPaymentStatus,
            String cancellationReason,
            LocalDate cancellationDate,
            String cancellationObservation,
            boolean rescheduled,
            LocalDate originalEventDate,
            LocalTime originalStartTime,
            LocalTime originalEndTime,
            OffsetDateTime createdAt
    ) {
        public static EventResponse from(Event event) {
            return from(event, BigDecimal.ZERO);
        }

        public static EventResponse from(Event event, BigDecimal paidAmount) {
            String packageName = event.getEventPackage() == null ? null : event.getEventPackage().getName();
            String packageIncludedServices = event.getEventPackage() == null ? null : event.getEventPackage().getIncludedServices();
            String packageTerms = event.getEventPackage() == null ? null : event.getEventPackage().getTerms();
            BigDecimal safePaid = paidAmount == null ? BigDecimal.ZERO : paidAmount;
            BigDecimal balance = event.getTotalAmount().subtract(safePaid).max(BigDecimal.ZERO);
            return new EventResponse(
                    event.getId(),
                    event.getClient().getId(),
                    event.getEventPackage() == null ? null : event.getEventPackage().getId(),
                    event.getClient().getFullName(),
                    event.getFloor().getName(),
                    packageName,
                    event.getTitle(),
                    event.getEventType(),
                    event.getEventDate(),
                    event.getStartTime(),
                    event.getEndTime(),
                    event.getStatus(),
                    event.getTotalAmount(),
                    event.getApdaycAmount(),
                    event.getApdaycPayer(),
                    event.getApdaycStatus(),
                    event.getApdaycNotes(),
                    packageIncludedServices,
                    packageTerms,
                    event.getCancellationType(),
                    event.getCancellationRequestedAt(),
                    event.getCancellationNoticeDays(),
                    event.getRetainedAdvanceAmount(),
                    event.getCancellationNotes(),
                    safePaid,
                    balance,
                    event.getCancellationAdvanceAmount(),
                    event.getCancellationRetainedAmount(),
                    event.getCancellationRefundedAmount(),
                    event.getCancellationPaymentStatus(),
                    event.getCancellationReason(),
                    event.getCancellationDate(),
                    event.getCancellationObservation(),
                    event.isRescheduled(),
                    event.getOriginalEventDate(),
                    event.getOriginalStartTime(),
                    event.getOriginalEndTime(),
                    event.getCreatedAt());
        }
    }

    public record ClientPaymentRequest(
            @NotNull LocalDate paymentDate,
            @NotBlank String concept,
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotBlank String method,
            PaymentType paymentType,
            String internalReceiptNumber,
            String notes
    ) {
    }

    public record ClientPaymentResponse(
            UUID id,
            UUID eventId,
            LocalDate paymentDate,
            String concept,
            BigDecimal amount,
            String method,
            PaymentType paymentType,
            boolean countsTowardsEventTotal,
            String internalReceiptNumber,
            String notes,
            OffsetDateTime createdAt
    ) {
        public static ClientPaymentResponse from(ClientPayment payment) {
            return new ClientPaymentResponse(
                    payment.getId(),
                    payment.getEvent().getId(),
                    payment.getPaymentDate(),
                    payment.getConcept(),
                    payment.getAmount(),
                    payment.getMethod(),
                    payment.getPaymentType(),
                    payment.isCountsTowardsEventTotal(),
                    payment.getInternalReceiptNumber(),
                    payment.getNotes(),
                    payment.getCreatedAt());
        }
    }

    public record FloorMetric(String floorName, long eventCount) {
    }

    public record RescheduleOptionEvent(
            UUID id,
            String title,
            LocalDate eventDate,
            LocalTime startTime,
            LocalTime endTime,
            String floorName,
            EventStatus status
    ) {
        public static RescheduleOptionEvent from(Event event) {
            return new RescheduleOptionEvent(
                    event.getId(),
                    event.getTitle(),
                    event.getEventDate(),
                    event.getStartTime(),
                    event.getEndTime(),
                    event.getFloor().getName(),
                    event.getStatus());
        }
    }

    public record RescheduleOptionsResponse(
            UUID eventId,
            LocalDate originalDate,
            LocalDate minAllowedDate,
            LocalDate maxAllowedDate,
            String floorName,
            java.util.List<RescheduleOptionEvent> scheduledEvents
    ) {
    }

    public record ContractPreviewResponse(
            UUID eventId,
            String clientName,
            String clientDocument,
            String clientPhone,
            String clientAddress,
            String floorName,
            String packageName,
            String title,
            String eventType,
            LocalDate eventDate,
            LocalTime startTime,
            LocalTime endTime,
            BigDecimal totalAmount,
            BigDecimal apdaycAmount,
            String apdaycPayer,
            String apdaycStatus,
            String apdaycNotes,
            BigDecimal guaranteeAmount,
            Integer capacityMaximum,
            String eventNotes,
            String guaranteeClause,
            String rescheduleClause,
            String apdaycClause,
            String packageLastPageTitle,
            String packageLastPageDetails,
            String packageTerms
    ) {
        public static ContractPreviewResponse from(Event event) {
            EventPackage eventPackage = event.getEventPackage();
            String packageName = eventPackage == null ? "Personalizado" : eventPackage.getName();
            BigDecimal guaranteeAmount = eventPackage == null || eventPackage.getGuaranteeAmount() == null
                    ? BigDecimal.ZERO
                    : eventPackage.getGuaranteeAmount();
            Integer capacityMaximum = eventPackage == null || eventPackage.getIncludedCapacity() == null
                    ? event.getFloor().getCapacity()
                    : eventPackage.getIncludedCapacity();
            if (event.getContractCapacityOverride() != null && event.getContractCapacityOverride() > 0) {
                capacityMaximum = event.getContractCapacityOverride();
            }
            String details = eventPackage == null ? "Servicios personalizados según lo acordado con el cliente." : eventPackage.getIncludedServices();
            String terms = eventPackage == null ? "" : eventPackage.getTerms();
            return new ContractPreviewResponse(
                    event.getId(),
                    event.getClient().getFullName(),
                    event.getClient().getDocumentNumber(),
                    event.getClient().getWhatsapp() != null && !event.getClient().getWhatsapp().isBlank()
                            ? event.getClient().getWhatsapp()
                            : event.getClient().getPhone(),
                    event.getClient().getAddress(),
                    event.getFloor().getName(),
                    packageName,
                    event.getTitle(),
                    event.getEventType(),
                    event.getEventDate(),
                    event.getStartTime(),
                    event.getEndTime(),
                    event.getTotalAmount(),
                    event.getApdaycAmount(),
                    event.getApdaycPayer(),
                    event.getApdaycStatus(),
                    event.getApdaycNotes(),
                    guaranteeAmount,
                    capacityMaximum,
                    event.getNotes(),
                    "La garantía por daños tiene por finalidad cubrir deterioros, pérdidas, roturas o saldos pendientes ocasionados durante el evento. Si al finalizar la revisión no se verifican daños ni deudas, será devuelta conforme a lo acordado por las partes. Los importes entregados por separación o reserva tienen carácter de bloqueo de fecha, coordinación operativa y gastos administrativos; por ello, ante desistimiento unilateral de EL ARRENDATARIO, no serán reembolsables.",
                    "Todo cambio de fecha debe solicitarse por escrito con una anticipación mínima de 15 días calendario antes del evento. Si EL ARRENDADOR acepta la reprogramación, EL ARRENDATARIO tendrá un plazo máximo de 2 meses para fijar una nueva fecha, siempre sujeto a disponibilidad del local, fechas libres y condiciones vigentes. Vencido dicho plazo sin nueva fecha aceptada por ambas partes, los importes entregados por reserva quedarán a favor de EL ARRENDADOR.",
                    "El pago de APDAYC, IGV u otros derechos, autorizaciones, permisos o tributos no incluidos será asumido por EL ARRENDATARIO, promoción, institución contratante o responsable declarado, salvo acuerdo escrito distinto entre las partes.",
                    "Detalle del paquete contratado: " + packageName,
                    details,
                    terms);
        }
    }

    public record DashboardResponse(
            long totalClients,
            long totalFloors,
            long totalPackages,
            long totalEvents,
            long eventsNext30Days,
            BigDecimal totalContracted,
            java.util.List<FloorMetric> eventsByFloor
    ) {
    }

    public record AppSettingsResponse(
            boolean peruApiTokenReady,
            String peruApiTokenSource,
            String peruApiTokenHint,
            boolean geminiApiKeyReady,
            String geminiApiKeySource,
            String geminiApiKeyHint,
            String geminiModel,
            Integer rescheduleMinNoticeDays,
            Integer rescheduleMaxMonths,
            Integer cancellationRetentionNoticeDays) {
    }

    public record UpdateAppSettingsRequest(
            String peruApiToken,
            Boolean clearPeruApiToken,
            String geminiApiKey,
            Boolean clearGeminiApiKey,
            String geminiModel,
            Integer rescheduleMinNoticeDays,
            Integer rescheduleMaxMonths,
            Integer cancellationRetentionNoticeDays) {
        public UpdateAppSettingsRequest {
            if (clearPeruApiToken == null) {
                clearPeruApiToken = false;
            }
            if (clearGeminiApiKey == null) {
                clearGeminiApiKey = false;
            }
        }
    }
}
