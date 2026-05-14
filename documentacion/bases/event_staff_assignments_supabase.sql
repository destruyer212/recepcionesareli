-- ============================================================
-- RECEPCIONES ARELI - Asignacion de equipo por evento
-- Ejecutar en Supabase/Postgres si necesitas preparar la base.
-- Este script es idempotente y no cambia la creacion de eventos.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS event_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    staff_member_id UUID NOT NULL REFERENCES staff_members(id),
    role VARCHAR(80) NOT NULL,
    role_key VARCHAR(80) NOT NULL,
    role_label VARCHAR(120) NOT NULL,
    slot_number INTEGER,
    agreed_payment NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE event_staff_assignments
ADD COLUMN IF NOT EXISTS role_key VARCHAR(80);

ALTER TABLE event_staff_assignments
ADD COLUMN IF NOT EXISTS role_label VARCHAR(120);

ALTER TABLE event_staff_assignments
ADD COLUMN IF NOT EXISTS slot_number INTEGER;

ALTER TABLE event_staff_assignments
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE event_staff_assignments
SET
    role_key = COALESCE(NULLIF(role_key, ''), NULLIF(role, ''), 'APOYO'),
    role_label = COALESCE(NULLIF(role_label, ''), NULLIF(role, ''), 'Personal de Apoyo'),
    active = COALESCE(active, TRUE)
WHERE role_key IS NULL
   OR role_key = ''
   OR role_label IS NULL
   OR role_label = '';

UPDATE event_staff_assignments
SET active = TRUE
WHERE active IS NULL;

ALTER TABLE event_staff_assignments
ALTER COLUMN role_key SET NOT NULL;

ALTER TABLE event_staff_assignments
ALTER COLUMN role_label SET NOT NULL;

ALTER TABLE event_staff_assignments
ALTER COLUMN active SET DEFAULT TRUE;

ALTER TABLE event_staff_assignments
ALTER COLUMN active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_staff_assignments_event_active
ON event_staff_assignments(event_id, active);

CREATE INDEX IF NOT EXISTS idx_event_staff_assignments_staff_active
ON event_staff_assignments(staff_member_id, active);

CREATE INDEX IF NOT EXISTS idx_event_staff_assignments_role_active
ON event_staff_assignments(role_key, active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_staff_assignments_event_role_slot_active
ON event_staff_assignments(event_id, role_key, COALESCE(slot_number, 0))
WHERE active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_staff_assignments_event_staff_active
ON event_staff_assignments(event_id, staff_member_id)
WHERE active = TRUE;
