package com.areli.api.service;

import com.areli.api.repository.ClientRepository;
import com.areli.api.repository.EventPackageRepository;
import com.areli.api.repository.EventRepository;
import com.areli.api.repository.FloorRepository;
import com.areli.api.web.dto.ApiDtos.DashboardResponse;
import com.areli.api.web.dto.ApiDtos.FloorMetric;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    private final ClientRepository clients;
    private final FloorRepository floors;
    private final EventPackageRepository packages;
    private final EventRepository events;

    public DashboardService(ClientRepository clients, FloorRepository floors, EventPackageRepository packages, EventRepository events) {
        this.clients = clients;
        this.floors = floors;
        this.packages = packages;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public DashboardResponse summary() {
        LocalDate today = LocalDate.now();
        Map<String, Long> eventCountsByFloor = events.countEventsByFloor().stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> ((Number) row[1]).longValue()));
        List<FloorMetric> floorMetrics = floors.findAllByOrderByLevelNumberAsc().stream()
                .map(floor -> new FloorMetric(floor.getName(), eventCountsByFloor.getOrDefault(floor.getName(), 0L)))
                .toList();

        return new DashboardResponse(
                clients.count(),
                floors.count(),
                packages.count(),
                events.count(),
                events.countByEventDateBetween(today, today.plusDays(30)),
                events.sumTotalContracted(),
                floorMetrics);
    }
}
