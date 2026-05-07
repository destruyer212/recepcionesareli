package com.areli.api.web;

import com.areli.api.repository.EventPackageRepository;
import com.areli.api.web.dto.ApiDtos.PackageResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/packages")
public class PackageController {
    private final EventPackageRepository packages;

    public PackageController(EventPackageRepository packages) {
        this.packages = packages;
    }

    @GetMapping
    public List<PackageResponse> list() {
        return packages.findByActiveTrueOrderByNameAsc().stream().map(PackageResponse::from).toList();
    }
}
