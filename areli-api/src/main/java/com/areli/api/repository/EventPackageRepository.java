package com.areli.api.repository;

import com.areli.api.domain.EventPackage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventPackageRepository extends JpaRepository<EventPackage, UUID> {
    List<EventPackage> findAllByOrderByNameAsc();

    List<EventPackage> findByActiveTrueOrderByNameAsc();
}
