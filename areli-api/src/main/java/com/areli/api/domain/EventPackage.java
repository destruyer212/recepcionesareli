package com.areli.api.domain;

import com.areli.api.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "event_packages")
public class EventPackage extends BaseEntity {

    @Column(nullable = false, length = 140)
    private String name;

    private String eventType;

    @Column(nullable = false)
    private BigDecimal basePrice = BigDecimal.ZERO;

    private Integer includedCapacity;
    private BigDecimal extraGuestPrice;
    private BigDecimal depositAmount;
    private BigDecimal depositPercent;
    private BigDecimal guaranteeAmount;
    private Integer durationHours;

    @Column(columnDefinition = "text")
    private String includedServices;

    @Column(columnDefinition = "text")
    private String terms;

    @Column(nullable = false)
    private boolean active = true;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(BigDecimal basePrice) {
        this.basePrice = basePrice;
    }

    public Integer getIncludedCapacity() {
        return includedCapacity;
    }

    public void setIncludedCapacity(Integer includedCapacity) {
        this.includedCapacity = includedCapacity;
    }

    public BigDecimal getGuaranteeAmount() {
        return guaranteeAmount;
    }

    public void setGuaranteeAmount(BigDecimal guaranteeAmount) {
        this.guaranteeAmount = guaranteeAmount;
    }

    public String getIncludedServices() {
        return includedServices;
    }

    public void setIncludedServices(String includedServices) {
        this.includedServices = includedServices;
    }

    public String getTerms() {
        return terms;
    }

    public void setTerms(String terms) {
        this.terms = terms;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
