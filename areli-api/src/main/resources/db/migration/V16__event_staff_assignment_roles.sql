-- ============================================================
-- ASIGNACION DE EQUIPO POR EVENTO
-- Extiende event_staff_assignments para roles oficiales,
-- mozos por numero y baja logica.
-- ============================================================

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
