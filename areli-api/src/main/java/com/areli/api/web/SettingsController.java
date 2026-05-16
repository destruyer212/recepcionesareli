package com.areli.api.web;

import com.areli.api.service.AppSettingsService;
import com.areli.api.web.dto.ApiDtos.AppSettingsResponse;
import com.areli.api.web.dto.ApiDtos.UpdateAppSettingsRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final AppSettingsService appSettingsService;

    public SettingsController(AppSettingsService appSettingsService) {
        this.appSettingsService = appSettingsService;
    }

    @GetMapping
    public AppSettingsResponse get() {
        return appSettingsService.getAppSettingsResponse();
    }

    @PutMapping
    public AppSettingsResponse update(@RequestBody UpdateAppSettingsRequest request) {
        if (Boolean.TRUE.equals(request.clearPeruApiToken())) {
            appSettingsService.clearPeruApiToken();
        } else if (request.peruApiToken() != null && !request.peruApiToken().isBlank()) {
            appSettingsService.setPeruApiToken(request.peruApiToken());
        }
        if (Boolean.TRUE.equals(request.clearGeminiApiKey())) {
            appSettingsService.clearGeminiApiKey();
        } else if (request.geminiApiKey() != null && !request.geminiApiKey().isBlank()) {
            appSettingsService.setGeminiApiKey(request.geminiApiKey());
        }
        appSettingsService.setGeminiModel(request.geminiModel());
        appSettingsService.setRescheduleMinNoticeDays(request.rescheduleMinNoticeDays());
        appSettingsService.setRescheduleMaxMonths(request.rescheduleMaxMonths());
        appSettingsService.setCancellationRetentionNoticeDays(request.cancellationRetentionNoticeDays());
        return appSettingsService.getAppSettingsResponse();
    }
}
