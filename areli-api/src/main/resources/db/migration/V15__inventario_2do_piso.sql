-- Inventario oficial del 2do piso.
-- Usa el mismo modelo de categorías/subcategorías y el UNIQUE por piso/categoría/subcategoría/nombre.

WITH data AS (
    SELECT * FROM (
        VALUES
        ('2do piso', 'Audio y Video', 'Pantallas', 'Pantalla gigante 3x2 P3', 'Pantalla gigante 3x2 en calidad P3.', 1, 'unidad', 14500.00, NULL, NULL),

        ('2do piso', 'Mobiliario', 'Sillas', 'Sillas doradas importadas', '88 sillas doradas importadas.', 88, 'unidad', 13200.00, NULL, NULL),
        ('2do piso', 'Mobiliario', 'Mesas', 'Mesas con base dorada y mesa de vidrio', '11 mesas con base dorada y mesa de vidrio.', 11, 'unidad', 5500.00, NULL, NULL),

        ('2do piso', 'Audio y Video', 'Parlantes', 'Parlantes aéreos amplificados', '3 parlantes aéreos amplificados.', 3, 'unidad', 2400.00, NULL, NULL),
        ('2do piso', 'Audio y Video', 'Consolas', 'Consola de 4 canales', '1 consola de 4 canales.', 1, 'unidad', 350.00, NULL, NULL),

        ('2do piso', 'Decoración y Escenografía', 'Flores e iluminación', 'Centros florales de mesas', 'Centros florales de mesas.', 11, 'unidad', 500.00, NULL, NULL),

        ('2do piso', 'Menaje', 'Cubiertos', 'Cuchillos dorados', '100 cuchillos dorados.', 100, 'unidad', 700.00, NULL, NULL),
        ('2do piso', 'Menaje', 'Cubiertos', 'Tenedores dorados', '100 tenedores dorados.', 100, 'unidad', 700.00, NULL, NULL),
        ('2do piso', 'Menaje', 'Platos', 'Platos de mesa blanco', '100 platos de mesa blanco.', 100, 'unidad', 800.00, NULL, NULL),
        ('2do piso', 'Menaje', 'Platos', 'Platos dorados', '100 platos dorados.', 100, 'unidad', 500.00, NULL, NULL),

        ('2do piso', 'Menaje', 'Servilletas', 'Servilletas de tela', '100 servilletas de tela.', 100, 'unidad', 450.00, NULL, NULL),
        ('2do piso', 'Menaje', 'Copas', 'Copas de champán', '100 copas de champán.', 100, 'unidad', 500.00, NULL, NULL),
        ('2do piso', 'Menaje', 'Copas', 'Copas doradas de vino', '100 copas doradas de vino.', 100, 'unidad', 600.00, NULL, NULL),
        ('2do piso', 'Menaje', 'Vasos', 'Vasos de vidrio para agua', '100 vasos de vidrio para agua.', 100, 'unidad', 300.00, NULL, NULL)
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
