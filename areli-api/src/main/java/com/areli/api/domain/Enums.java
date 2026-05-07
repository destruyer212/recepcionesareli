package com.areli.api.domain;

public final class Enums {
    private Enums() {
    }

    public enum FloorStatus {
        AVAILABLE, UNDER_CONSTRUCTION, MAINTENANCE, UNAVAILABLE
    }

    public enum EventStatus {
        INQUIRY, SEPARATED, CONTRACTED, PREPARING, COMPLETED, CLOSED, CANCELLED, RESCHEDULED
    }

    public enum DocumentType {
        DNI, RUC
    }

    public enum CancellationType {
        CLIENT_REQUEST, FORCE_MAJEURE, NO_SHOW, RESCHEDULE_REQUEST_REJECTED
    }

    public enum ContractStatus {
        DRAFT, SIGNED, VOIDED, FINISHED
    }

    public enum GuaranteeStatus {
        PENDING, RECEIVED, RETURNED, PARTIALLY_RETAINED, FULLY_RETAINED
    }

    public enum StaffPaymentStatus {
        PENDING, PARTIAL, PAID
    }

    public enum InventoryCondition {
        GOOD, REGULAR, DAMAGED, LOST, IN_REPAIR
    }

    public enum MediaType {
        PHOTO, VIDEO, REEL
    }
}
