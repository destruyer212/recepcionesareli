-- Normaliza nombres de piso en inventario para evitar duplicados visuales:
-- "1er Piso" y "1er piso" deben ser el mismo piso.

CREATE OR REPLACE FUNCTION canonical_inventario_piso(value TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
    normalized TEXT;
BEGIN
    cleaned := BTRIM(value);
    normalized := LOWER(cleaned);

    IF normalized LIKE '%1er%' OR normalized LIKE '%piso 1%' OR normalized LIKE '%primer piso%' THEN
        RETURN '1er piso';
    END IF;

    IF normalized LIKE '%2do%' OR normalized LIKE '%piso 2%' OR normalized LIKE '%segundo piso%' THEN
        RETURN '2do piso';
    END IF;

    IF normalized LIKE '%3er%'
        OR normalized LIKE '%4to%'
        OR normalized LIKE '%3 y 4%'
        OR normalized LIKE '%3ro%'
        OR normalized LIKE '%cuarto piso%' THEN
        RETURN '3er y 4to piso';
    END IF;

    RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

WITH normalized AS (
    SELECT
        id,
        canonical_inventario_piso(piso) AS canonical_piso
    FROM inventario_items
),
conflicting AS (
    SELECT source.id
    FROM inventario_items source
    JOIN normalized n ON n.id = source.id
    JOIN inventario_items target
      ON target.id <> source.id
     AND target.piso = n.canonical_piso
     AND target.categoria_id = source.categoria_id
     AND target.subcategoria_id = source.subcategoria_id
     AND target.nombre = source.nombre
    WHERE source.piso <> n.canonical_piso
)
UPDATE inventario_items item
SET activo = FALSE,
    updated_at = NOW()
FROM conflicting c
WHERE item.id = c.id;

WITH normalized AS (
    SELECT
        id,
        canonical_inventario_piso(piso) AS canonical_piso
    FROM inventario_items
)
UPDATE inventario_items item
SET piso = n.canonical_piso,
    updated_at = NOW()
FROM normalized n
WHERE item.id = n.id
  AND item.piso <> n.canonical_piso
  AND NOT EXISTS (
      SELECT 1
      FROM inventario_items target
      WHERE target.id <> item.id
        AND target.piso = n.canonical_piso
        AND target.categoria_id = item.categoria_id
        AND target.subcategoria_id = item.subcategoria_id
        AND target.nombre = item.nombre
  );

CREATE OR REPLACE FUNCTION set_inventario_item_piso_canonical()
RETURNS TRIGGER AS $$
BEGIN
    NEW.piso = canonical_inventario_piso(NEW.piso);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventario_items_piso_canonical ON inventario_items;
CREATE TRIGGER trg_inventario_items_piso_canonical
BEFORE INSERT OR UPDATE OF piso ON inventario_items
FOR EACH ROW
EXECUTE FUNCTION set_inventario_item_piso_canonical();
