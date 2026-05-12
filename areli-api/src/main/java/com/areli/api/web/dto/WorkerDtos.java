package com.areli.api.web.dto;

import com.areli.api.domain.PaymentAndOperations.StaffMember;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public final class WorkerDtos {
    private WorkerDtos() {
    }

    public record WorkerRequest(
            @NotBlank String category,
            @NotBlank String name,
            String phone,
            String notes
    ) {
        public StaffMember toEntity() {
            StaffMember worker = new StaffMember();
            worker.setRole(category);
            worker.setFullName(name);
            worker.setPhone(phone);
            worker.setNotes(notes);
            worker.setActive(true);
            return worker;
        }
    }

    public record WorkerResponse(
            UUID id,
            String category,
            String name,
            String phone,
            String notes
    ) {
        public static WorkerResponse from(StaffMember worker) {
            return new WorkerResponse(
                    worker.getId(),
                    worker.getRole(),
                    worker.getFullName(),
                    worker.getPhone(),
                    worker.getNotes());
        }
    }
}
