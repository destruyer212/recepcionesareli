package com.areli.api.domain;

import com.areli.api.common.BaseEntity;
import com.areli.api.domain.Enums.CancellationType;
import com.areli.api.domain.Enums.EventStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "events")
public class Event extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "floor_id", nullable = false)
    private Floor floor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_id")
    private EventPackage eventPackage;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 80)
    private String eventType;

    @Column(nullable = false)
    private LocalDate eventDate;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status = EventStatus.SEPARATED;

    @Column(nullable = false)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal apdaycAmount = BigDecimal.ZERO;

    @Column(name = "contract_capacity_override")
    private Integer contractCapacityOverride;

    @Column(nullable = false, length = 80)
    private String apdaycPayer = "CLIENT";

    @Column(nullable = false, length = 40)
    private String apdaycStatus = "PENDING";

    @Column(columnDefinition = "text")
    private String apdaycNotes;

    @Column(columnDefinition = "text")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancellation_type", length = 50)
    private CancellationType cancellationType;

    @Column(name = "cancellation_requested_at")
    private LocalDate cancellationRequestedAt;

    @Column(name = "cancellation_notice_days")
    private Integer cancellationNoticeDays;

    @Column(name = "retained_advance_amount", nullable = false)
    private BigDecimal retainedAdvanceAmount = BigDecimal.ZERO;

    @Column(name = "cancellation_notes", columnDefinition = "text")
    private String cancellationNotes;

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public Floor getFloor() {
        return floor;
    }

    public void setFloor(Floor floor) {
        this.floor = floor;
    }

    public EventPackage getEventPackage() {
        return eventPackage;
    }

    public void setEventPackage(EventPackage eventPackage) {
        this.eventPackage = eventPackage;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public LocalDate getEventDate() {
        return eventDate;
    }

    public void setEventDate(LocalDate eventDate) {
        this.eventDate = eventDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public BigDecimal getApdaycAmount() {
        return apdaycAmount;
    }

    public void setApdaycAmount(BigDecimal apdaycAmount) {
        this.apdaycAmount = apdaycAmount;
    }

    public Integer getContractCapacityOverride() {
        return contractCapacityOverride;
    }

    public void setContractCapacityOverride(Integer contractCapacityOverride) {
        this.contractCapacityOverride = contractCapacityOverride;
    }

    public String getApdaycPayer() {
        return apdaycPayer;
    }

    public void setApdaycPayer(String apdaycPayer) {
        this.apdaycPayer = apdaycPayer;
    }

    public String getApdaycStatus() {
        return apdaycStatus;
    }

    public void setApdaycStatus(String apdaycStatus) {
        this.apdaycStatus = apdaycStatus;
    }

    public String getApdaycNotes() {
        return apdaycNotes;
    }

    public void setApdaycNotes(String apdaycNotes) {
        this.apdaycNotes = apdaycNotes;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public CancellationType getCancellationType() {
        return cancellationType;
    }

    public void setCancellationType(CancellationType cancellationType) {
        this.cancellationType = cancellationType;
    }

    public LocalDate getCancellationRequestedAt() {
        return cancellationRequestedAt;
    }

    public void setCancellationRequestedAt(LocalDate cancellationRequestedAt) {
        this.cancellationRequestedAt = cancellationRequestedAt;
    }

    public Integer getCancellationNoticeDays() {
        return cancellationNoticeDays;
    }

    public void setCancellationNoticeDays(Integer cancellationNoticeDays) {
        this.cancellationNoticeDays = cancellationNoticeDays;
    }

    public BigDecimal getRetainedAdvanceAmount() {
        return retainedAdvanceAmount;
    }

    public void setRetainedAdvanceAmount(BigDecimal retainedAdvanceAmount) {
        this.retainedAdvanceAmount = retainedAdvanceAmount;
    }

    public String getCancellationNotes() {
        return cancellationNotes;
    }

    public void setCancellationNotes(String cancellationNotes) {
        this.cancellationNotes = cancellationNotes;
    }
}
