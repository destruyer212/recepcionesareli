-- Acelera consultas del calendario, conflictos por piso y orden cronológico.
create index if not exists idx_events_date_start_time
    on events(event_date, start_time);

-- Optimiza findScheduleCandidates (floor + rango fecha + estado != CANCELLED + order by).
create index if not exists idx_events_floor_date_status_start
    on events(floor_id, event_date, status, start_time);

-- Optimiza búsquedas/agrupaciones por piso y fecha.
create index if not exists idx_events_floor_date
    on events(floor_id, event_date);
