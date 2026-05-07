package com.areli.api.domain;

import com.areli.api.common.BaseEntity;
import com.areli.api.domain.Enums.FloorStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "floors")
public class Floor extends BaseEntity {

    @Column(nullable = false, unique = true, length = 80)
    private String name;

    @Column(nullable = false, unique = true)
    private Integer levelNumber;

    private Integer capacity;
    @Column(name = "area_m2")
    private BigDecimal areaM2;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FloorStatus status = FloorStatus.AVAILABLE;

    @Column(columnDefinition = "text")
    private String description;

    public String getName() {
        return name;
    }

    public Integer getLevelNumber() {
        return levelNumber;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public BigDecimal getAreaM2() {
        return areaM2;
    }

    public FloorStatus getStatus() {
        return status;
    }

    public String getDescription() {
        return description;
    }
}
