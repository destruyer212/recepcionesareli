package com.areli.api.service;

import com.areli.api.domain.AppSetting;
import com.areli.api.repository.AppSettingRepository;
import com.areli.api.web.dto.ApiDtos.AppSettingsResponse;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppSettingsService {
    public static final String PERU_API_TOKEN_KEY = "peru_api_token";
    public static final String RESCHEDULE_MIN_NOTICE_DAYS_KEY = "reschedule_min_notice_days";
    public static final String RESCHEDULE_MAX_MONTHS_KEY = "reschedule_max_months";
    public static final String CANCELLATION_RETENTION_NOTICE_DAYS_KEY = "cancellation_retention_notice_days";
    private static final int DEFAULT_RESCHEDULE_MIN_NOTICE_DAYS = 15;
    private static final int DEFAULT_RESCHEDULE_MAX_MONTHS = 2;
    private static final int DEFAULT_CANCELLATION_RETENTION_NOTICE_DAYS = 15;

    private final AppSettingRepository settings;
    private final String envPeruApiToken;

    public AppSettingsService(AppSettingRepository settings, @Value("${PERU_API_TOKEN:}") String envPeruApiToken) {
        this.settings = settings;
        this.envPeruApiToken = envPeruApiToken == null ? "" : envPeruApiToken.trim();
    }

    @Transactional(readOnly = true)
    public String resolvePeruApiToken() {
        Optional<String> fromDb = settings.findById(PERU_API_TOKEN_KEY).map(AppSetting::getSettingValue);
        if (fromDb.isPresent() && fromDb.get() != null && !fromDb.get().isBlank()) {
            return fromDb.get().trim();
        }
        return envPeruApiToken;
    }

    @Transactional(readOnly = true)
    public AppSettingsResponse getAppSettingsResponse() {
        Optional<AppSetting> row = settings.findById(PERU_API_TOKEN_KEY);
        boolean hasDb = row.map(AppSetting::getSettingValue).filter(s -> s != null && !s.isBlank()).isPresent();
        boolean hasEnv = !envPeruApiToken.isBlank();
        String resolved = resolvePeruApiToken();
        boolean ready = !resolved.isBlank();

        String source;
        if (hasDb) {
            source = "BASE_DE_DATOS";
        } else if (hasEnv) {
            source = "ENTORNO";
        } else {
            source = "NINGUNO";
        }

        String hint;
        if (hasDb) {
            String t = row.get().getSettingValue().trim();
            String tail = t.length() <= 4 ? t : t.substring(t.length() - 4);
            hint = "Token guardado en base de datos (termina en " + tail + ").";
        } else if (hasEnv) {
            hint = "Usando variable de entorno PERU_API_TOKEN del servidor.";
        } else {
            hint = "Sin token configurado. Autocompletado DNI/RUC no funcionará hasta que guardes un token.";
        }

        return new AppSettingsResponse(
                ready,
                source,
                hint,
                resolveIntSetting(RESCHEDULE_MIN_NOTICE_DAYS_KEY, DEFAULT_RESCHEDULE_MIN_NOTICE_DAYS),
                resolveIntSetting(RESCHEDULE_MAX_MONTHS_KEY, DEFAULT_RESCHEDULE_MAX_MONTHS),
                resolveIntSetting(CANCELLATION_RETENTION_NOTICE_DAYS_KEY, DEFAULT_CANCELLATION_RETENTION_NOTICE_DAYS));
    }

    @Transactional
    public void setPeruApiToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        AppSetting row = settings.findById(PERU_API_TOKEN_KEY).orElseGet(() -> new AppSetting(PERU_API_TOKEN_KEY, null));
        row.setSettingValue(token.trim());
        settings.save(row);
    }

    @Transactional
    public void clearPeruApiToken() {
        if (settings.existsById(PERU_API_TOKEN_KEY)) {
            settings.deleteById(PERU_API_TOKEN_KEY);
        }
    }

    @Transactional
    public void setRescheduleMinNoticeDays(Integer value) {
        upsertInt(RESCHEDULE_MIN_NOTICE_DAYS_KEY, value, 0, 365, "Días mínimos de anticipación para reprogramación");
    }

    @Transactional
    public void setRescheduleMaxMonths(Integer value) {
        upsertInt(RESCHEDULE_MAX_MONTHS_KEY, value, 0, 24, "Meses máximos para reprogramación");
    }

    @Transactional
    public void setCancellationRetentionNoticeDays(Integer value) {
        upsertInt(
                CANCELLATION_RETENTION_NOTICE_DAYS_KEY,
                value,
                0,
                365,
                "Días umbral para retención por cancelación");
    }

    @Transactional(readOnly = true)
    public int rescheduleMinNoticeDays() {
        return resolveIntSetting(RESCHEDULE_MIN_NOTICE_DAYS_KEY, DEFAULT_RESCHEDULE_MIN_NOTICE_DAYS);
    }

    @Transactional(readOnly = true)
    public int rescheduleMaxMonths() {
        return resolveIntSetting(RESCHEDULE_MAX_MONTHS_KEY, DEFAULT_RESCHEDULE_MAX_MONTHS);
    }

    @Transactional(readOnly = true)
    public int cancellationRetentionNoticeDays() {
        return resolveIntSetting(CANCELLATION_RETENTION_NOTICE_DAYS_KEY, DEFAULT_CANCELLATION_RETENTION_NOTICE_DAYS);
    }

    private int resolveIntSetting(String key, int fallback) {
        Optional<String> raw = settings.findById(key).map(AppSetting::getSettingValue);
        if (raw.isEmpty() || raw.get() == null || raw.get().isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(raw.get().trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private void upsertInt(String key, Integer value, int min, int max, String label) {
        if (value == null) {
            return;
        }
        if (value < min || value > max) {
            throw new IllegalArgumentException(label + " fuera de rango (" + min + " a " + max + ").");
        }
        AppSetting row = settings.findById(key).orElseGet(() -> new AppSetting(key, null));
        row.setSettingValue(String.valueOf(value));
        settings.save(row);
    }
}
