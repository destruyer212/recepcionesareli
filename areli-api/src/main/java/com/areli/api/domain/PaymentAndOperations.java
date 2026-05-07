package com.areli.api.domain;

import com.areli.api.common.BaseEntity;
import com.areli.api.domain.Enums.GuaranteeStatus;
import com.areli.api.domain.Enums.InventoryCondition;
import com.areli.api.domain.Enums.StaffPaymentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

public final class PaymentAndOperations {
    private PaymentAndOperations() {
    }

    @Entity
    @Table(name = "client_payments")
    public static class ClientPayment extends BaseEntity {
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "event_id", nullable = false)
        private Event event;

        @Column(nullable = false)
        private LocalDate paymentDate;

        @Column(nullable = false)
        private String concept;

        @Column(nullable = false)
        private BigDecimal amount;

        @Column(nullable = false)
        private String method;

        private String internalReceiptNumber;

        @Column(columnDefinition = "text")
        private String notes;
    }

    @Entity
    @Table(name = "guarantees")
    public static class Guarantee extends BaseEntity {
        @OneToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "event_id", nullable = false)
        private Event event;

        @Column(nullable = false)
        private BigDecimal amount = BigDecimal.ZERO;

        private LocalDate receivedAt;
        private LocalDate returnedAt;

        @Column(nullable = false)
        private BigDecimal retainedAmount = BigDecimal.ZERO;

        @Enumerated(EnumType.STRING)
        @Column(nullable = false)
        private GuaranteeStatus status = GuaranteeStatus.PENDING;

        @Column(columnDefinition = "text")
        private String reason;
    }

    @Entity
    @Table(name = "staff_members")
    public static class StaffMember extends BaseEntity {
        @Column(nullable = false)
        private String fullName;
        private String documentNumber;
        private String phone;
        @Column(nullable = false)
        private String role;
        private BigDecimal usualPayment;
        @Column(nullable = false)
        private boolean active = true;
        @Column(columnDefinition = "text")
        private String notes;
    }

    @Entity
    @Table(name = "event_staff_assignments")
    public static class EventStaffAssignment extends BaseEntity {
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "event_id", nullable = false)
        private Event event;
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "staff_member_id", nullable = false)
        private StaffMember staffMember;
        @Column(nullable = false)
        private String role;
        @Column(nullable = false)
        private BigDecimal agreedPayment = BigDecimal.ZERO;
        @Column(nullable = false)
        private BigDecimal paidAmount = BigDecimal.ZERO;
        @Enumerated(EnumType.STRING)
        @Column(nullable = false)
        private StaffPaymentStatus paymentStatus = StaffPaymentStatus.PENDING;
        @Column(columnDefinition = "text")
        private String notes;
    }

    @Entity
    @Table(name = "expenses")
    public static class Expense extends BaseEntity {
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "event_id")
        private Event event;
        @Column(nullable = false)
        private LocalDate expenseDate;
        @Column(nullable = false)
        private String category;
        @Column(nullable = false, columnDefinition = "text")
        private String description;
        @Column(nullable = false)
        private BigDecimal amount;
        private String method;
        private String receiptReference;
    }

    @Entity(name = "InventoryItem")
    @Table(name = "inventory_items")
    public static class InventoryItem extends BaseEntity {
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "floor_id")
        private Floor floor;

        @Column(nullable = false)
        private String name;
        private String category;
        @Column(nullable = false)
        private Integer quantity = 0;
        @Column(nullable = false)
        private BigDecimal unitCost = BigDecimal.ZERO;
        private String location;
        @Column(name = "specific_location")
        private String specificLocation;
        @Column(name = "minimum_quantity", nullable = false)
        private Integer minimumQuantity = 0;
        @Enumerated(EnumType.STRING)
        @Column(nullable = false)
        private InventoryCondition conditionStatus = InventoryCondition.GOOD;
        private LocalDate purchaseDate;
        @Column(nullable = false)
        private boolean active = true;
        @Column(columnDefinition = "text")
        private String notes;

        public Floor getFloor() {
            return floor;
        }

        public void setFloor(Floor floor) {
            this.floor = floor;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }

        public BigDecimal getUnitCost() {
            return unitCost;
        }

        public void setUnitCost(BigDecimal unitCost) {
            this.unitCost = unitCost;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public String getSpecificLocation() {
            return specificLocation;
        }

        public void setSpecificLocation(String specificLocation) {
            this.specificLocation = specificLocation;
        }

        public Integer getMinimumQuantity() {
            return minimumQuantity;
        }

        public void setMinimumQuantity(Integer minimumQuantity) {
            this.minimumQuantity = minimumQuantity;
        }

        public InventoryCondition getConditionStatus() {
            return conditionStatus;
        }

        public void setConditionStatus(InventoryCondition conditionStatus) {
            this.conditionStatus = conditionStatus;
        }

        public LocalDate getPurchaseDate() {
            return purchaseDate;
        }

        public void setPurchaseDate(LocalDate purchaseDate) {
            this.purchaseDate = purchaseDate;
        }

        public boolean isActive() {
            return active;
        }

        public void setActive(boolean active) {
            this.active = active;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }
    }
}
