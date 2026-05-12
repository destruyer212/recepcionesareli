-- ============================================================
-- INVENTARIO ARELI - Script completo (Supabase/Postgres)
-- Correcciones:
-- 1) inventario_items.subcategoria_id => NOT NULL
-- 2) Fila "Mesas de buffet" => observación correcta
-- UNIQUE: (piso, categoria_id, subcategoria_id, nombre)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. TABLA: CATEGORÍAS
-- ============================================================

CREATE TABLE IF NOT EXISTS inventario_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. TABLA: SUBCATEGORÍAS
-- ============================================================

CREATE TABLE IF NOT EXISTS inventario_subcategorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID NOT NULL REFERENCES inventario_categorias(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_inventario_subcategorias_categoria_nombre
    UNIQUE (categoria_id, nombre)
);

-- ============================================================
-- 3. TABLA: ITEMS / BIENES DEL INVENTARIO
-- ============================================================

CREATE TABLE IF NOT EXISTS inventario_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    piso VARCHAR(50) NOT NULL,
    categoria_id UUID NOT NULL REFERENCES inventario_categorias(id),
    subcategoria_id UUID NOT NULL REFERENCES inventario_subcategorias(id),

    nombre VARCHAR(200) NOT NULL, -- ÍTEM específico
    descripcion TEXT,

    cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
    unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidad',

    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_unitario NUMERIC(12,2) GENERATED ALWAYS AS (
        CASE
            WHEN cantidad > 0 THEN ROUND(valor_total / cantidad, 2)
            ELSE 0
        END
    ) STORED,

    estado VARCHAR(50) NOT NULL DEFAULT 'Disponible',
    ubicacion VARCHAR(150),
    observacion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_inventario_items_estado
    CHECK (estado IN ('Disponible', 'En uso', 'Mantenimiento', 'Dañado', 'Perdido', 'Retirado')),

    CONSTRAINT chk_inventario_items_cantidad
    CHECK (cantidad > 0)
);

ALTER TABLE inventario_items
ALTER COLUMN subcategoria_id SET NOT NULL;

-- ============================================================
-- 4. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_inventario_items_piso
ON inventario_items(piso);

CREATE INDEX IF NOT EXISTS idx_inventario_items_categoria
ON inventario_items(categoria_id);

CREATE INDEX IF NOT EXISTS idx_inventario_items_subcategoria
ON inventario_items(subcategoria_id);

CREATE INDEX IF NOT EXISTS idx_inventario_items_estado
ON inventario_items(estado);

CREATE INDEX IF NOT EXISTS idx_inventario_items_activo
ON inventario_items(activo);

-- ============================================================
-- 5. UNIQUE CORREGIDO (ítem específico)
--    UNIQUE (piso, categoria_id, subcategoria_id, nombre)
-- ============================================================

ALTER TABLE inventario_items
DROP CONSTRAINT IF EXISTS uq_inventario_items_piso_nombre;

ALTER TABLE inventario_items
DROP CONSTRAINT IF EXISTS uq_inventario_items_piso_cat_sub_nombre;

ALTER TABLE inventario_items
ADD CONSTRAINT uq_inventario_items_piso_cat_sub_nombre
UNIQUE (piso, categoria_id, subcategoria_id, nombre);

-- ============================================================
-- 6. Trigger updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventario_categorias_updated_at ON inventario_categorias;
CREATE TRIGGER trg_inventario_categorias_updated_at
BEFORE UPDATE ON inventario_categorias
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inventario_subcategorias_updated_at ON inventario_subcategorias;
CREATE TRIGGER trg_inventario_subcategorias_updated_at
BEFORE UPDATE ON inventario_subcategorias
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inventario_items_updated_at ON inventario_items;
CREATE TRIGGER trg_inventario_items_updated_at
BEFORE UPDATE ON inventario_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 7. INSERT CATEGORÍAS
-- ============================================================

INSERT INTO inventario_categorias (nombre, descripcion)
VALUES
('Mobiliario', 'Mesas, sillas, sillones y elementos físicos principales del salón.'),
('Audio y Video', 'Pantallas, parlantes, consolas y equipos tecnológicos para eventos.'),
('Menaje', 'Cubiertos, platos, copas, vasos y servilletas.'),
('Decoración y Escenografía', 'Elementos decorativos, estructuras, fondos, letras, ingreso y zona de fotos.'),
('Buffet y Servicio', 'Mesas y elementos usados para buffet o atención del evento.')
ON CONFLICT (nombre) DO UPDATE SET
descripcion = EXCLUDED.descripcion,
updated_at = NOW();

-- ============================================================
-- 8. INSERT SUBCATEGORÍAS
-- ============================================================

WITH data AS (
    SELECT * FROM (
        VALUES
        ('Mobiliario', 'Mesas', 'Mesas principales del salón.'),
        ('Mobiliario', 'Sillas', 'Sillas para invitados.'),
        ('Mobiliario', 'Sillones', 'Sillones principales o decorativos.'),
        ('Mobiliario', 'Asientos especiales', 'Asientos decorativos o temáticos.'),

        ('Audio y Video', 'Pantallas', 'Pantallas LED o gigantes.'),
        ('Audio y Video', 'Parlantes', 'Equipos de sonido.'),
        ('Audio y Video', 'Consolas', 'Consolas de audio o control.'),

        ('Menaje', 'Cubiertos', 'Cuchillos, tenedores y similares.'),
        ('Menaje', 'Platos', 'Platos de mesa y platos decorativos.'),
        ('Menaje', 'Servilletas', 'Servilletas de tela.'),
        ('Menaje', 'Copas', 'Copas de champán, vino u otros.'),
        ('Menaje', 'Vasos', 'Vasos de vidrio para agua u otros.'),

        ('Decoración y Escenografía', 'Ingreso', 'Elementos decorativos para la entrada.'),
        ('Decoración y Escenografía', 'Fondos decorativos', 'Muros, fondos y estructuras de fondo.'),
        ('Decoración y Escenografía', 'Bases decorativas', 'Bases para torta, velas y otros.'),
        ('Decoración y Escenografía', 'Flores e iluminación', 'Parantes, flores y luces decorativas.'),
        ('Decoración y Escenografía', 'Alfombras', 'Alfombras para ingreso o pasarela.'),
        ('Decoración y Escenografía', 'Estructuras metálicas', 'Estructuras de fierro, aluminio o similares.'),
        ('Decoración y Escenografía', 'Letras y números', 'Letras, números y frases decorativas.'),
        ('Decoración y Escenografía', 'Zona de fotos', 'Elementos para fotos o photo booth.'),
        ('Decoración y Escenografía', 'Separadores', 'Separadores decorativos o de control.'),

        ('Buffet y Servicio', 'Mesas de buffet', 'Mesas o juegos de mesa para buffet.')
    ) AS t(categoria, subcategoria, descripcion)
)
INSERT INTO inventario_subcategorias (categoria_id, nombre, descripcion)
SELECT
    c.id,
    d.subcategoria,
    d.descripcion
FROM data d
JOIN inventario_categorias c ON c.nombre = d.categoria
ON CONFLICT (categoria_id, nombre) DO UPDATE SET
descripcion = EXCLUDED.descripcion,
updated_at = NOW();

-- ============================================================
-- 9. INSERT INVENTARIO (1er Piso)
--    Corrección fila "Mesas de buffet": observación OK.
--    Conflict acorde UNIQUE(piso, categoria_id, subcategoria_id, nombre)
-- ============================================================

WITH data AS (
    SELECT * FROM (
        VALUES
        ('1er Piso', 'Mobiliario', 'Mesas', 'Mesas con base de acero y vidrio', '10 mesas de base de acero con mesa de vidrio.', 10, 'unidad', 5000.00, NULL, NULL),
        ('1er Piso', 'Mobiliario', 'Sillas', 'Sillas Tiffany acrílicas importadas', 'Sillas modelo Tiffany, material acrílico importadas con base de algodón.', 80, 'unidad', 12400.00, NULL, NULL),
        ('1er Piso', 'Audio y Video', 'Pantallas', 'Pantalla gigante 3x2 calidad P3', 'Pantalla gigante de medida 3x2 en calidad P3.', 1, 'unidad', 17000.00, NULL, NULL),
        ('1er Piso', 'Menaje', 'Cubiertos', 'Cuchillos dorados', 'Cuchillos dorados para mesa.', 100, 'unidad', 700.00, NULL, NULL),
        ('1er Piso', 'Menaje', 'Cubiertos', 'Tenedores dorados', 'Tenedores dorados para mesa.', 100, 'unidad', 700.00, NULL, NULL),
        ('1er Piso', 'Menaje', 'Platos', 'Platos de mesa blancos', 'Platos blancos de mesa.', 100, 'unidad', 800.00, NULL, NULL),
        ('1er Piso', 'Menaje', 'Platos', 'Platos dorados', 'Platos dorados decorativos o de presentación.', 100, 'unidad', 500.00, NULL, NULL),
        ('1er Piso', 'Menaje', 'Servilletas', 'Servilletas de tela', 'Servilletas de tela para eventos.', 100, 'unidad', 450.00, NULL, NULL),
        ('1er Piso', 'Menaje', 'Copas', 'Copas de champán', 'Copas para champán.', 100, 'unidad', 500.00, NULL, NULL),
        ('1er Piso', 'Menaje', 'Copas', 'Copas doradas de vino', 'Copas doradas para vino.', 100, 'unidad', 600.00, NULL, NULL),
        ('1er Piso', 'Menaje', 'Vasos', 'Vasos de vidrio para agua', 'Vasos de vidrio para agua.', 100, 'unidad', 300.00, NULL, NULL),
        ('1er Piso', 'Mobiliario', 'Sillones', 'Sillón de rey', 'Sillón principal de rey.', 1, 'unidad', 1200.00, NULL, NULL),
        ('1er Piso', 'Mobiliario', 'Sillones', 'Sillón de reina', 'Sillón principal de reina.', 1, 'unidad', 1200.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Separadores', 'Separadores dorados con mancuerna', 'Separadores dorados con mancuerna.', 4, 'unidad', 1000.00, NULL, NULL),
        ('1er Piso', 'Audio y Video', 'Parlantes', 'Parlantes aéreos', 'Parlantes aéreos para sonido.', 3, 'unidad', 1800.00, NULL, NULL),
        ('1er Piso', 'Audio y Video', 'Consolas', 'Consola', 'Consola para audio o control.', 1, 'unidad', 450.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Estructuras metálicas', 'Corazón de aluminio con asiento', 'Corazón de aluminio con asiento decorativo.', 1, 'unidad', 450.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Ingreso', 'Corazón de aluminio para ingreso', 'Corazón de aluminio para el ingreso.', 1, 'unidad', 1200.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Fondos decorativos', 'Muro romano', 'Muro romano decorativo.', 1, 'unidad', 1500.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Bases decorativas', 'Base de torta con luces', 'Base de torta con luces.', 1, 'unidad', 900.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Bases decorativas', 'Bases de velas para ingreso', 'Bases de velas para el ingreso.', 2, 'unidad', 1000.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Flores e iluminación', 'Parantes de flores blancas con luces', 'Parantes de flores blancas con luces.', 2, 'unidad', 600.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Alfombras', 'Alfombra roja de 15x2', 'Alfombra roja medida 15x2.', 1, 'unidad', 300.00, NULL, NULL),

        -- ✅ Corrección: observación va en la columna observacion (último campo del VALUES)
        ('1er Piso', 'Buffet y Servicio', 'Mesas de buffet', 'Mesas de buffet', 'Juego de mesa de 3 unidades para buffet.', 1, 'juego', 450.00, NULL, 'Juego compuesto por 3 mesas.'),

        ('1er Piso', 'Decoración y Escenografía', 'Estructuras metálicas', 'Tubo desarmable de 3x2', 'Tubo desarmable de medida 3x2.', 1, 'unidad', 280.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Estructuras metálicas', 'Estrella de fierro dorado', 'Estrella de fierro dorado.', 1, 'unidad', 500.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Estructuras metálicas', 'Estructura octagonal de fierro', 'Octagonal de fierro.', 1, 'unidad', 500.00, NULL, NULL),
        ('1er Piso', 'Mobiliario', 'Asientos especiales', 'Media luna con base para sentarse', 'Media luna con base para sentarse.', 1, 'unidad', 900.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Zona de fotos', 'Cubo espejado de 3x2 para foto', 'Cubo espejado de medida 3x2 para fotos.', 1, 'unidad', 1300.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Letras y números', 'Letras PROMO', 'Letras decorativas que forman la palabra PROMO.', 5, 'unidad', 900.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Letras y números', 'Letras MIS', 'Letras decorativas que forman la palabra MIS.', 3, 'unidad', 600.00, NULL, NULL),
        ('1er Piso', 'Decoración y Escenografía', 'Letras y números', 'Números 15', 'Números decorativos 15.', 2, 'unidad', 400.00, NULL, NULL)
    ) AS t(
        piso,
        categoria,
        subcategoria,
        nombre,
        descripcion,
        cantidad,
        unidad_medida,
        valor_total,
        ubicacion,
        observacion
    )
)
INSERT INTO inventario_items (
    piso,
    categoria_id,
    subcategoria_id,
    nombre,
    descripcion,
    cantidad,
    unidad_medida,
    valor_total,
    estado,
    ubicacion,
    observacion
)
SELECT
    d.piso,
    c.id,
    s.id,
    d.nombre,
    d.descripcion,
    d.cantidad,
    d.unidad_medida,
    d.valor_total,
    'Disponible',
    d.ubicacion,
    d.observacion
FROM data d
JOIN inventario_categorias c
    ON c.nombre = d.categoria
JOIN inventario_subcategorias s
    ON s.nombre = d.subcategoria
   AND s.categoria_id = c.id
ON CONFLICT (piso, categoria_id, subcategoria_id, nombre) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    cantidad = EXCLUDED.cantidad,
    unidad_medida = EXCLUDED.unidad_medida,
    valor_total = EXCLUDED.valor_total,
    estado = EXCLUDED.estado,
    ubicacion = EXCLUDED.ubicacion,
    observacion = EXCLUDED.observacion,
    activo = TRUE,
    updated_at = NOW();

-- ============================================================
-- 10. VISTA RESUMEN
-- ============================================================

CREATE OR REPLACE VIEW vw_inventario_resumen_categoria AS
SELECT
    i.piso,
    c.nombre AS categoria,
    COUNT(i.id) AS total_items,
    SUM(i.cantidad) AS cantidad_total,
    SUM(i.valor_total) AS valor_total
FROM inventario_items i
JOIN inventario_categorias c ON c.id = i.categoria_id
WHERE i.activo = TRUE
GROUP BY i.piso, c.nombre
ORDER BY i.piso, c.nombre;

-- ============================================================
-- 11. VISTA DETALLADA
-- ============================================================

CREATE OR REPLACE VIEW vw_inventario_detalle AS
SELECT
    i.id,
    i.piso,
    c.nombre AS categoria,
    s.nombre AS subcategoria,
    i.nombre,
    i.descripcion,
    i.cantidad,
    i.unidad_medida,
    i.valor_unitario,
    i.valor_total,
    i.estado,
    i.ubicacion,
    i.observacion,
    i.activo,
    i.created_at,
    i.updated_at
FROM inventario_items i
JOIN inventario_categorias c ON c.id = i.categoria_id
JOIN inventario_subcategorias s ON s.id = i.subcategoria_id
ORDER BY i.piso, c.nombre, s.nombre, i.nombre;

-- ============================================================
-- 12. Consultas rápidas de verificación (opcional)
-- ============================================================

-- Total general del 1er piso
SELECT
    piso,
    SUM(valor_total) AS total_valorizado
FROM inventario_items
WHERE piso = '1er Piso'
  AND activo = TRUE
GROUP BY piso;

-- Resumen por categoría (1er piso)
SELECT * FROM vw_inventario_resumen_categoria
WHERE piso = '1er Piso';

-- Detalle completo (1er piso)
SELECT * FROM vw_inventario_detalle
WHERE piso = '1er Piso';
