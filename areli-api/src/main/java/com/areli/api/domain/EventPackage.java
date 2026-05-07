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

    public String getEventType() {
        return eventType;
    }

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public Integer getIncludedCapacity() {
        return includedCapacity;
    }

    public BigDecimal getGuaranteeAmount() {
        return guaranteeAmount;
    }

    public String getIncludedServices() {
        return includedServices;
    }

    public String getTerms() {
        return terms;
    }

    public boolean isActive() {
        return active;
    }
}
