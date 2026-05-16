-- ============================================================
-- RECEPCIONES ARELI - Trabajadores oficiales
--
-- Este personal queda disponible para los 3 niveles/ambientes:
-- 1er piso, 2do piso y 3er/4to piso. La asignacion real se hace por evento.
--
-- No inserta roles sin contacto asignado:
-- - Event Planner
-- - Anfitriona
--
-- Script idempotente:
-- - Si encuentra el mismo telefono en el mismo cargo, actualiza.
-- - Si encuentra el mismo nombre en el mismo cargo, actualiza.
-- - Si no existe, inserta.
-- ============================================================

WITH data AS (
    SELECT *
    FROM (
        VALUES
        ('COORDINADOR_EVENTO', 'Yngrid Arana Fernandez', '962203154', 'Responsable operativo durante el evento.'),
        ('DJ', 'Fernando Huarango', '974387911', 'Musica, cabina y momentos especiales.'),

        -- Mismo proveedor disponible para los dos cargos oficiales del sistema.
        ('FOTOGRAFO', 'Fernando Ruiz Minaya - Filmaciones Minaya', '912545786', 'Registro fotografico del evento.'),
        ('VIDEOGRAFO', 'Fernando Ruiz Minaya - Filmaciones Minaya', '912545786', 'Video, reels, tomas y entrega final.'),

        ('SEGURIDAD', 'Jose Luis Gonzales', '928803953', 'Control de ingreso y orden.'),

        -- Mozos: el backend reconoce MOZO_1, MOZO_2, MOZO_3... como compatibles con el rol MOZOS.
        ('MOZO_1', 'Paola', '992491778', 'Mozo 1. Atencion a invitados, servicio de mesa y apoyo durante el evento.'),
        ('MOZO_2', 'Cecilia', '993605418', 'Mozo 2. Atencion a invitados, servicio de mesa y apoyo durante el evento.'),
        ('MOZO_3', 'Edith', '953213547', 'Mozo 3. Atencion a invitados, servicio de mesa y apoyo durante el evento.'),

        ('BARMAN', 'Cristian Milian - Barman 2', '989388861', 'Bar, bebidas y servicio de cocteles.'),
        ('BARMAN', 'Kenny - Barman', '962368153', 'Bar, bebidas y servicio de cocteles.'),

        ('HORA_LOCA', 'Elvis', '953174729', 'Show, animacion y accesorios.'),
        ('DECORACION', 'Katerin Ruiz', '930890372', 'Montaje, estilo y detalles visuales.'),
        ('BOCADITOS', 'Helen', '960536303', 'Mesa dulce, salados y atencion.'),
        ('COCINA', 'Jose Miguel - Chef', '960308289', 'Preparacion, apoyo y salida de platos.'),
        ('LIMPIEZA', 'Polo', '996699572', 'Orden antes, durante y cierre.'),
        ('APOYO', 'Hermana Genesis', '987227953', 'Refuerzo para tareas generales.'),
        ('APOYO', 'Yandali', '907411043', 'Refuerzo para tareas generales.')
    ) AS t(role, full_name, phone, notes)
),
updated AS (
    UPDATE staff_members s
    SET
        full_name = d.full_name,
        phone = d.phone,
        role = d.role,
        notes = d.notes,
        active = TRUE,
        updated_at = NOW()
    FROM data d
    WHERE s.role = d.role
      AND (
          regexp_replace(COALESCE(s.phone, ''), '\D', '', 'g') = d.phone
          OR lower(trim(s.full_name)) = lower(trim(d.full_name))
      )
    RETURNING s.id
)
INSERT INTO staff_members (
    full_name,
    document_number,
    phone,
    role,
    usual_payment,
    active,
    notes,
    created_at,
    updated_at
)
SELECT
    d.full_name,
    NULL,
    d.phone,
    d.role,
    NULL,
    TRUE,
    d.notes,
    NOW(),
    NOW()
FROM data d
WHERE NOT EXISTS (
    SELECT 1
    FROM staff_members s
    WHERE s.role = d.role
      AND (
          regexp_replace(COALESCE(s.phone, ''), '\D', '', 'g') = d.phone
          OR lower(trim(s.full_name)) = lower(trim(d.full_name))
      )
);
