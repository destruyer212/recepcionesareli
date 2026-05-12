package com.areli.api.repository;

import com.areli.api.domain.PaymentAndOperations.StaffMember;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StaffMemberRepository extends JpaRepository<StaffMember, UUID> {
    @Query("""
            select staff
            from StaffMember staff
            where staff.active = true
            order by staff.role asc, staff.fullName asc
            """)
    List<StaffMember> findActiveOrderByRoleAndFullName();
}
