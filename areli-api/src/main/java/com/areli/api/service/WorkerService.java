package com.areli.api.service;

import com.areli.api.domain.PaymentAndOperations.StaffMember;
import com.areli.api.repository.StaffMemberRepository;
import com.areli.api.web.dto.WorkerDtos.WorkerRequest;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkerService {
    private final StaffMemberRepository staffMembers;

    public WorkerService(StaffMemberRepository staffMembers) {
        this.staffMembers = staffMembers;
    }

    @Transactional(readOnly = true)
    public List<StaffMember> listActive() {
        return staffMembers.findActiveOrderByRoleAndFullName();
    }

    @Transactional
    public StaffMember create(WorkerRequest request) {
        StaffMember worker = request.toEntity();
        applyRequest(worker, request);
        return staffMembers.save(worker);
    }

    @Transactional
    public StaffMember update(UUID id, WorkerRequest request) {
        StaffMember worker = staffMembers.findById(Objects.requireNonNull(id, "id"))
                .orElseThrow(() -> new EntityNotFoundException("Contacto de personal no encontrado"));
        applyRequest(worker, request);
        worker.setActive(true);
        return staffMembers.save(worker);
    }

    private static void applyRequest(StaffMember worker, WorkerRequest request) {
        worker.setRole(request.category().trim().toUpperCase());
        worker.setFullName(request.name().trim());
        worker.setPhone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim());
        worker.setNotes(request.notes() == null ? null : request.notes().trim());
    }

    @Transactional
    public void deactivate(UUID id) {
        StaffMember worker = staffMembers.findById(Objects.requireNonNull(id, "id"))
                .orElseThrow(() -> new EntityNotFoundException("Contacto de personal no encontrado"));
        worker.setActive(false);
        staffMembers.save(worker);
    }
}
