-- Datos de ejemplo para Clientes sin Ventas Multicategoría
-- Ejecutar después del schema.sql

-- =============================================
-- DATOS DE EJEMPLO
-- =============================================

-- Insertar zonas
INSERT INTO zonas (codigo, nombre, descripcion) VALUES
('SDO', 'Santo Domingo', 'Zona metropolitana de Santo Domingo'),
('STI', 'Santiago', 'Zona norte - Santiago'),
('SDE', 'Santo Domingo Este', 'Zona este del Gran Santo Domingo')
ON CONFLICT (codigo) DO NOTHING;

-- Insertar rutas
INSERT INTO rutas (codigo, nombre, zona_id, descripcion) VALUES
('1L', 'Lunes 1x', (SELECT id FROM zonas WHERE codigo = 'SDO'), 'Ruta de lunes primera vuelta'),
('2M', 'Martes 2x', (SELECT id FROM zonas WHERE codigo = 'SDO'), 'Ruta de martes segunda vuelta'),
('3W', 'Miércoles 3x', (SELECT id FROM zonas WHERE codigo = 'STI'), 'Ruta de miércoles tercera vuelta')
ON CONFLICT (codigo) DO NOTHING;

-- Insertar categorías
INSERT INTO categorias (codigo, nombre, descripcion, orden) VALUES
('ENSURE', 'Ensure', 'Productos nutricionales Ensure', 1),
('CHOCOLATE', 'Chocolate', 'Productos de chocolate', 2),
('ALPINA', 'Alpina', 'Productos lácteos Alpina', 3),
('SUPER_DE_ALIM', 'Super de Alim.', 'Suplementos alimenticios', 4)
ON CONFLICT (codigo) DO NOTHING;

-- Crear usuario administrador de ejemplo
DO $$
DECLARE
    admin_user_id UUID;
    supervisor1_id UUID;
    supervisor2_id UUID;
    vendedor1_id UUID;
    vendedor2_id UUID;
    zona_sdo_id UUID;
    zona_sti_id UUID;
BEGIN
    -- Obtener IDs de zonas
    SELECT id INTO zona_sdo_id FROM zonas WHERE codigo = 'SDO';
    SELECT id INTO zona_sti_id FROM zonas WHERE codigo = 'STI';
    
    -- Insertar supervisores de ejemplo
    INSERT INTO supervisores (codigo, nombre_completo, zona_id) VALUES
    ('SUP001', 'CARLOS VALDEZ (Sto. Dom.)', zona_sdo_id),
    ('SUP002', 'ISMAEL ZORRILLA (Sto. Dom.)', zona_sdo_id),
    ('SUP003', 'SEVERO ESCALANTE (Sto. Dom.)', zona_sdo_id)
    ON CONFLICT (codigo) DO NOTHING;
    
    -- Obtener IDs de supervisores
    SELECT id INTO supervisor1_id FROM supervisores WHERE codigo = 'SUP001';
    SELECT id INTO supervisor2_id FROM supervisores WHERE codigo = 'SUP002';
    
    -- Insertar vendedores de ejemplo
    INSERT INTO vendedores (codigo, nombre_completo, zona_id, supervisor_id) VALUES
    ('E56', 'PEDRO JOSE BURGOS', zona_sdo_id, supervisor1_id),
    ('E81', 'YEURI ANTONIO PARDO ACOSTA', zona_sdo_id, supervisor2_id),
    ('E02', 'LUIS MANUEL DE LA CRUZ R.', zona_sdo_id, (SELECT id FROM supervisores WHERE codigo = 'SUP003'))
    ON CONFLICT (codigo) DO NOTHING;
    
    -- Insertar clientes de ejemplo
    INSERT INTO clientes (codigo, nombre, zona_id, ruta_id) VALUES
    ('61842', 'CASA NANDO', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('75599', 'CASA RUBIO', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('96832', 'COLMADO BOMBAYA', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('96903', 'COLMADO ZAPATA 2', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('96909', 'COLMADO SAN MIGUEL', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('96910', 'COLMADO RAMÍREZ', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('96914', 'COLMADO LUIS', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('96919', 'COLMADO LA OPCION 1', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('96923', 'CASA NEREYDA', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('96928', 'COLMADO ESQUINA EL LORO', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('80188', 'CALLE AVELINO#50LOS COCO', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('80191', 'COLM. JEOVA YIRET', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('80200', 'COLM. LA UNIÓN', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('35663', 'COLM. LOURDES', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L')),
    ('35869', 'COLM. RENZO', zona_sdo_id, (SELECT id FROM rutas WHERE codigo = '1L'))
    ON CONFLICT (codigo) DO NOTHING;
    
    -- Insertar asignaciones de ejemplo basadas en los datos del Excel
    INSERT INTO asignaciones (cliente_id, categoria_id, vendedor_id, supervisor_id, estado, fecha_asignacion) 
    SELECT 
        c.id as cliente_id,
        cat.id as categoria_id,
        v.id as vendedor_id,
        s.id as supervisor_id,
        CASE 
            WHEN (c.codigo = '61842' AND cat.codigo = 'ENSURE') THEN '0'
            WHEN (c.codigo = '61842' AND cat.codigo = 'CHOCOLATE') THEN 'Activado'
            WHEN (c.codigo = '61842' AND cat.codigo = 'ALPINA') THEN '0'
            WHEN (c.codigo = '61842' AND cat.codigo = 'SUPER_DE_ALIM') THEN '0'
            WHEN (c.codigo = '75599' AND cat.codigo = 'ENSURE') THEN '0'
            WHEN (c.codigo = '75599' AND cat.codigo = 'CHOCOLATE') THEN 'Activado'
            WHEN (c.codigo = '75599' AND cat.codigo = 'ALPINA') THEN 'Activado'
            WHEN (c.codigo = '75599' AND cat.codigo = 'SUPER_DE_ALIM') THEN '0'
            WHEN (c.codigo = '96832' AND cat.codigo = 'ENSURE') THEN 'Activado'
            WHEN (c.codigo = '96832' AND cat.codigo = 'CHOCOLATE') THEN '0'
            WHEN (c.codigo = '96832' AND cat.codigo = 'ALPINA') THEN '0'
            WHEN (c.codigo = '96832' AND cat.codigo = 'SUPER_DE_ALIM') THEN '0'
            WHEN (c.codigo = '96903' AND cat.codigo = 'ENSURE') THEN '0'
            WHEN (c.codigo = '96903' AND cat.codigo = 'CHOCOLATE') THEN 'Activado'
            WHEN (c.codigo = '96903' AND cat.codigo = 'ALPINA') THEN '0'
            WHEN (c.codigo = '96903' AND cat.codigo = 'SUPER_DE_ALIM') THEN 'Activado'
            WHEN (c.codigo = '96914' AND cat.codigo = 'ENSURE') THEN 'Activado'
            WHEN (c.codigo = '96914' AND cat.codigo = 'CHOCOLATE') THEN 'Activado'
            WHEN (c.codigo = '96914' AND cat.codigo = 'ALPINA') THEN '0'
            WHEN (c.codigo = '96914' AND cat.codigo = 'SUPER_DE_ALIM') THEN '0'
            WHEN (c.codigo = '96919' AND cat.codigo = 'ENSURE') THEN 'Activado'
            WHEN (c.codigo = '96919' AND cat.codigo = 'CHOCOLATE') THEN 'Activado'
            WHEN (c.codigo = '96919' AND cat.codigo = 'ALPINA') THEN 'Activado'
            WHEN (c.codigo = '96919' AND cat.codigo = 'SUPER_DE_ALIM') THEN '0'
            WHEN (c.codigo = '80200' AND cat.codigo = 'ENSURE') THEN '0'
            WHEN (c.codigo = '80200' AND cat.codigo = 'CHOCOLATE') THEN 'Activado'
            WHEN (c.codigo = '80200' AND cat.codigo = 'ALPINA') THEN '0'
            WHEN (c.codigo = '80200' AND cat.codigo = 'SUPER_DE_ALIM') THEN '0'
            WHEN (c.codigo = '35869' AND cat.codigo = 'ENSURE') THEN 'Activado'
            WHEN (c.codigo = '35869' AND cat.codigo = 'CHOCOLATE') THEN 'Activado'
            WHEN (c.codigo = '35869' AND cat.codigo = 'ALPINA') THEN '0'
            WHEN (c.codigo = '35869' AND cat.codigo = 'SUPER_DE_ALIM') THEN '0'
            ELSE '0'
        END as estado,
        CURRENT_DATE as fecha_asignacion
    FROM clientes c
    CROSS JOIN categorias cat
    JOIN vendedores v ON (
        (c.codigo IN ('61842', '75599', '96832', '96903', '96909', '96910', '96914', '96919', '96923', '96928') AND v.codigo = 'E56') OR
        (c.codigo IN ('80188', '80191', '80200') AND v.codigo = 'E81') OR
        (c.codigo IN ('35663', '35869') AND v.codigo = 'E02')
    )
    JOIN supervisores s ON v.supervisor_id = s.id
    WHERE c.codigo IN ('61842', '75599', '96832', '96903', '96909', '96910', '96914', '96919', '96923', '96928', '80188', '80191', '80200', '35663', '35869')
    ON CONFLICT (cliente_id, categoria_id, vendedor_id, fecha_asignacion) DO NOTHING;
    
END $$;

-- =============================================
-- VISTAS ÚTILES PARA REPORTES
-- =============================================

-- Vista de asignaciones con información completa
CREATE OR REPLACE VIEW vista_asignaciones_completa AS
SELECT 
    a.id,
    a.estado,
    a.fecha_asignacion,
    c.codigo as cliente_codigo,
    c.nombre as cliente_nombre,
    cat.codigo as categoria_codigo,
    cat.nombre as categoria_nombre,
    v.codigo as vendedor_codigo,
    v.nombre_completo as vendedor_nombre,
    s.codigo as supervisor_codigo,
    s.nombre_completo as supervisor_nombre,
    z.codigo as zona_codigo,
    z.nombre as zona_nombre,
    r.codigo as ruta_codigo,
    r.nombre as ruta_nombre,
    -- Calcular estado del cliente (CONDICIONATE)
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM asignaciones a2 
            WHERE a2.cliente_id = a.cliente_id 
            AND a2.fecha_asignacion = a.fecha_asignacion
            AND a2.estado = 'Activado'
        ) = 4 THEN 'Activado'
        ELSE 'FALTA'
    END as condicionate
FROM asignaciones a
JOIN clientes c ON a.cliente_id = c.id
JOIN categorias cat ON a.categoria_id = cat.id
JOIN vendedores v ON a.vendedor_id = v.id
JOIN supervisores s ON a.supervisor_id = s.id
JOIN zonas z ON v.zona_id = z.id
LEFT JOIN rutas r ON c.ruta_id = r.id;

-- Vista de estadísticas por vendedor
CREATE OR REPLACE VIEW vista_stats_vendedor AS
SELECT 
    v.id as vendedor_id,
    v.codigo as vendedor_codigo,
    v.nombre_completo as vendedor_nombre,
    s.codigo as supervisor_codigo,
    s.nombre_completo as supervisor_nombre,
    z.nombre as zona_nombre,
    COUNT(DISTINCT a.cliente_id) as total_clientes,
    COUNT(CASE WHEN a.estado = 'Activado' THEN 1 END) as total_activaciones,
    COUNT(DISTINCT CASE WHEN a.estado = 'Activado' THEN a.cliente_id END) as clientes_con_activacion,
    ROUND(
        COUNT(CASE WHEN a.estado = 'Activado' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as porcentaje_activacion,
    -- Clientes totalmente activados (4/4 categorías)
    COUNT(DISTINCT CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM asignaciones a2 
            WHERE a2.cliente_id = a.cliente_id 
            AND a2.vendedor_id = a.vendedor_id
            AND a2.fecha_asignacion = a.fecha_asignacion
            AND a2.estado = 'Activado'
        ) = 4 THEN a.cliente_id 
    END) as clientes_totalmente_activados
FROM vendedores v
JOIN supervisores s ON v.supervisor_id = s.id
JOIN zonas z ON v.zona_id = z.id
LEFT JOIN asignaciones a ON v.id = a.vendedor_id
WHERE v.activo = true
GROUP BY v.id, v.codigo, v.nombre_completo, s.codigo, s.nombre_completo, z.nombre;

-- Vista de estadísticas por supervisor
CREATE OR REPLACE VIEW vista_stats_supervisor AS
SELECT 
    s.id as supervisor_id,
    s.codigo as supervisor_codigo,
    s.nombre_completo as supervisor_nombre,
    z.nombre as zona_nombre,
    COUNT(DISTINCT v.id) as total_vendedores,
    COUNT(DISTINCT a.cliente_id) as total_clientes,
    COUNT(CASE WHEN a.estado = 'Activado' THEN 1 END) as total_activaciones,
    ROUND(
        COUNT(CASE WHEN a.estado = 'Activado' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as porcentaje_activacion,
    COUNT(DISTINCT CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM asignaciones a2 
            WHERE a2.cliente_id = a.cliente_id 
            AND a2.fecha_asignacion = a.fecha_asignacion
            AND a2.estado = 'Activado'
        ) = 4 THEN a.cliente_id 
    END) as clientes_totalmente_activados
FROM supervisores s
JOIN zonas z ON s.zona_id = z.id
LEFT JOIN vendedores v ON s.id = v.supervisor_id AND v.activo = true
LEFT JOIN asignaciones a ON v.id = a.vendedor_id
WHERE s.activo = true
GROUP BY s.id, s.codigo, s.nombre_completo, z.nombre;
