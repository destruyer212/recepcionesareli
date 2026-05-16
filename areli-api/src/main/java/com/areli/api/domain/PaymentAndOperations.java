package com.areli.api.domain;

import com.areli.api.common.BaseEntity;
import com.areli.api.domain.Enums.GuaranteeStatus;
import com.areli.api.domain.Enums.PaymentType;
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

    @Entity(name = "ClientPayment")
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

        @Enumerated(EnumType.STRING)
        @Column(nullable = false)
        private PaymentType paymentType = PaymentType.EVENT_PAYMENT;

        @Column(nullable = false)
        private boolean countsTowardsEventTotal = true;

        private String internalReceiptNumber;

        @Column(name = "operation_number", length = 80)
        private String operationNumber;

        @Column(columnDefinition = "text")
        private String notes;

        public Event getEvent() {
            return event;
        }

        public void setEvent(Event event) {
            this.event = event;
        }

        public LocalDate getPaymentDate() {
            return paymentDate;
        }

        public void setPaymentDate(LocalDate paymentDate) {
            this.paymentDate = paymentDate;
        }

        public String getConcept() {
            return concept;
        }

        public void setConcept(String concept) {
            this.concept = concept;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }

        public String getMethod() {
            return method;
        }

        public void setMethod(String method) {
            this.method = method;
        }

        public PaymentType getPaymentType() {
            return paymentType;
        }

        public void setPaymentType(PaymentType paymentType) {
            this.paymentType = paymentType;
        }

        public boolean isCountsTowardsEventTotal() {
            return countsTowardsEventTotal;
        }

        public void setCountsTowardsEventTotal(boolean countsTowardsEventTotal) {
            this.countsTowardsEventTotal = countsTowardsEventTotal;
        }

        public String getInternalReceiptNumber() {
            return internalReceiptNumber;
        }

        public void setInternalReceiptNumber(String internalReceiptNumber) {
            this.internalReceiptNumber = internalReceiptNumber;
        }

        public String getOperationNumber() {
            return operationNumber;
        }

        public void setOperationNumber(String operationNumber) {
            this.operationNumber = operationNumber;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }
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

    @Entity(name = "StaffMember")
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

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }

        public String getDocumentNumber() {
            return documentNumber;
        }

        public void setDocumentNumber(String documentNumber) {
            this.documentNumber = documentNumber;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public BigDecimal getUsualPayment() {
            return usualPayment;
        }

        public void setUsualPayment(BigDecimal usualPayment) {
            this.usualPayment = usualPayment;
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

    @Entity(name = "EventStaffAssignment")
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
        @Column(name = "role_key", nullable = false)
        private String roleKey;
        @Column(name = "role_label", nullable = false)
        private String roleLabel;
        @Column(name = "slot_number")
        private Integer slotNumber;
        @Column(nullable = false)
        private BigDecimal agreedPayment = BigDecimal.ZERO;
        @Column(nullable = false)
        private BigDecimal paidAmount = BigDecimal.ZERO;
        @Enumerated(EnumType.STRING)
        @Column(nullable = false)
        private StaffPaymentStatus paymentStatus = StaffPaymentStatus.PENDING;
        @Column(nullable = false)
        private boolean active = true;
        @Column(columnDefinition = "text")
        private String notes;

        public Event getEvent() {
            return event;
        }

        public void setEvent(Event event) {
            this.event = event;
        }

        public StaffMember getStaffMember() {
            return staffMember;
        }

        public void setStaffMember(StaffMember staffMember) {
            this.staffMember = staffMember;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getRoleKey() {
            return roleKey;
        }

        public void setRoleKey(String roleKey) {
            this.roleKey = roleKey;
        }

        public String getRoleLabel() {
            return roleLabel;
        }

        public void setRoleLabel(String roleLabel) {
            this.roleLabel = roleLabel;
        }

        public Integer getSlotNumber() {
            return slotNumber;
        }

        public void setSlotNumber(Integer slotNumber) {
            this.slotNumber = slotNumber;
        }

        public BigDecimal getAgreedPayment() {
            return agreedPayment;
        }

        public void setAgreedPayment(BigDecimal agreedPayment) {
            this.agreedPayment = agreedPayment;
        }

        public BigDecimal getPaidAmount() {
            return paidAmount;
        }

        public void setPaidAmount(BigDecimal paidAmount) {
            this.paidAmount = paidAmount;
        }

        public StaffPaymentStatus getPaymentStatus() {
            return paymentStatus;
        }

        public void setPaymentStatus(StaffPaymentStatus paymentStatus) {
            this.paymentStatus = paymentStatus;
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

    @Entity(name = "InventoryCategory")
    @Table(name = "inventario_categorias")
    public static class InventoryCategory extends BaseEntity {
        @Column(nullable = false)
        private String nombre;
        @Column(columnDefinition = "text")
        private String descripcion;
        @Column(nullable = false)
        private boolean activo = true;

        public String getNombre() {
            return nombre;
        }

        public void setNombre(String nombre) {
            this.nombre = nombre;
        }

        public String getDescripcion() {
            return descripcion;
        }

        public void setDescripcion(String descripcion) {
            this.descripcion = descripcion;
        }

        public boolean isActivo() {
            return activo;
        }

        public void setActivo(boolean activo) {
            this.activo = activo;
        }
    }

    @Entity(name = "InventorySubcategory")
    @Table(name = "inventario_subcategorias")
    public static class InventorySubcategory extends BaseEntity {
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "categoria_id", nullable = false)
        private InventoryCategory categoria;
        @Column(nullable = false)
        private String nombre;
        @Column(columnDefinition = "text")
        private String descripcion;
        @Column(nullable = false)
        private boolean activo = true;

        public InventoryCategory getCategoria() {
            return categoria;
        }

        public void setCategoria(InventoryCategory categoria) {
            this.categoria = categoria;
        }

        public String getNombre() {
            return nombre;
        }

        public void setNombre(String nombre) {
            this.nombre = nombre;
        }

        public String getDescripcion() {
            return descripcion;
        }

        public void setDescripcion(String descripcion) {
            this.descripcion = descripcion;
        }

        public boolean isActivo() {
            return activo;
        }

        public void setActivo(boolean activo) {
            this.activo = activo;
        }
    }

    @Entity(name = "InventoryItem")
    @Table(name = "inventario_items")
    public static class InventoryItem extends BaseEntity {
        @Column(nullable = false)
        private String piso;
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "categoria_id", nullable = false)
        private InventoryCategory categoria;
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "subcategoria_id", nullable = false)
        private InventorySubcategory subcategoria;
        @Column(nullable = false)
        private String nombre;
        @Column(columnDefinition = "text")
        private String descripcion;
        @Column(nullable = false)
        private BigDecimal cantidad = BigDecimal.ONE;
        @Column(nullable = false)
        private String unidadMedida = "unidad";
        @Column(nullable = false)
        private BigDecimal valorTotal = BigDecimal.ZERO;
        @Column(insertable = false, updatable = false)
        private BigDecimal valorUnitario = BigDecimal.ZERO;
        @Column(nullable = false)
        private String estado = "Disponible";
        private String ubicacion;
        @Column(columnDefinition = "text")
        private String observacion;
        @Column(nullable = false)
        private boolean activo = true;

        public String getPiso() {
            return piso;
        }

        public void setPiso(String piso) {
            this.piso = piso;
        }

        public InventoryCategory getCategoria() {
            return categoria;
        }

        public void setCategoria(InventoryCategory categoria) {
            this.categoria = categoria;
        }

        public InventorySubcategory getSubcategoria() {
            return subcategoria;
        }

        public void setSubcategoria(InventorySubcategory subcategoria) {
            this.subcategoria = subcategoria;
        }

        public String getNombre() {
            return nombre;
        }

        public void setNombre(String nombre) {
            this.nombre = nombre;
        }

        public String getDescripcion() {
            return descripcion;
        }

        public void setDescripcion(String descripcion) {
            this.descripcion = descripcion;
        }

        public BigDecimal getCantidad() {
            return cantidad;
        }

        public void setCantidad(BigDecimal cantidad) {
            this.cantidad = cantidad;
        }

        public String getUnidadMedida() {
            return unidadMedida;
        }

        public void setUnidadMedida(String unidadMedida) {
            this.unidadMedida = unidadMedida;
        }

        public BigDecimal getValorTotal() {
            return valorTotal;
        }

        public void setValorTotal(BigDecimal valorTotal) {
            this.valorTotal = valorTotal;
        }

        public BigDecimal getValorUnitario() {
            return valorUnitario;
        }

        public String getEstado() {
            return estado;
        }

        public void setEstado(String estado) {
            this.estado = estado;
        }

        public String getUbicacion() {
            return ubicacion;
        }

        public void setUbicacion(String ubicacion) {
            this.ubicacion = ubicacion;
        }

        public String getObservacion() {
            return observacion;
        }

        public void setObservacion(String observacion) {
            this.observacion = observacion;
        }

        public boolean isActivo() {
            return activo;
        }

        public void setActivo(boolean activo) {
            this.activo = activo;
        }
    }
}
