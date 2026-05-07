package com.areli.api.web;

import com.areli.api.repository.FloorRepository;
import com.areli.api.web.dto.ApiDtos.FloorResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/floors")
public class FloorController {
    private final FloorRepository floors;

    public FloorController(FloorRepository floors) {
        this.floors = floors;
    }

    @GetMapping
    public List<FloorResponse> list() {
        return floors.findAllByOrderByLevelNumberAsc().stream().map(FloorResponse::from).toList();
    }
}
