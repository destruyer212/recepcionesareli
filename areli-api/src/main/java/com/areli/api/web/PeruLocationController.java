package com.areli.api.web;

import com.areli.api.web.dto.ApiDtos.PeruDistrictResponse;
import com.areli.api.web.dto.ApiDtos.PeruLocationsResponse;
import com.areli.api.web.dto.ApiDtos.PeruProvinceResponse;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/locations/peru")
public class PeruLocationController {
    private final JdbcTemplate jdbcTemplate;

    public PeruLocationController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public PeruLocationsResponse list() {
        List<PeruProvinceResponse> provinces = jdbcTemplate.query(
                """
                        select p.ubigeo, p.name, p.department_ubigeo, d.name as department_name
                        from peru_provinces p
                        join peru_departments d on d.ubigeo = p.department_ubigeo
                        order by d.name, p.name
                        """,
                (rs, rowNum) -> new PeruProvinceResponse(
                        rs.getString("ubigeo"),
                        rs.getString("name"),
                        rs.getString("department_ubigeo"),
                        rs.getString("department_name")));
        List<PeruDistrictResponse> districts = jdbcTemplate.query(
                """
                        select dis.ubigeo,
                               dis.name,
                               dis.province_ubigeo,
                               p.name as province_name,
                               dis.department_ubigeo,
                               d.name as department_name
                        from peru_districts dis
                        join peru_provinces p on p.ubigeo = dis.province_ubigeo
                        join peru_departments d on d.ubigeo = dis.department_ubigeo
                        order by d.name, p.name, dis.name
                        """,
                (rs, rowNum) -> new PeruDistrictResponse(
                        rs.getString("ubigeo"),
                        rs.getString("name"),
                        rs.getString("province_ubigeo"),
                        rs.getString("province_name"),
                        rs.getString("department_ubigeo"),
                        rs.getString("department_name")));
        return new PeruLocationsResponse(provinces, districts);
    }
}
