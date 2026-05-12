package com.areli.api.domain;

import com.areli.api.common.BaseEntity;
import com.areli.api.domain.Enums.GuaranteeStatus;
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
