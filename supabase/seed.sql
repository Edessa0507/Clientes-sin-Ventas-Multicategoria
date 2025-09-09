-- =====================================================
-- DATOS INICIALES - PWA GENERADOR DE CLIENTES SIN VENTAS
-- =====================================================

-- Insertar zonas de ejemplo
INSERT INTO zonas (codigo, nombre, descripcion) VALUES
('Z001', 'ZONA NORTE', 'Zona Norte - Santiago y alrededores'),
('Z002', 'ZONA SUR', 'Zona Sur - Santo Domingo y alrededores'),
('Z003', 'ZONA ESTE', 'Zona Este - La Romana y alrededores'),
('Z004', 'ZONA OESTE', 'Zona Oeste - San Juan y alrededores');

-- Insertar rutas de ejemplo
INSERT INTO rutas (zona_id, codigo, nombre, descripcion) VALUES
((SELECT id FROM zonas WHERE codigo = 'Z001'), 'R001', 'RUTA SANTIAGO CENTRO', 'Centro de Santiago'),
((SELECT id FROM zonas WHERE codigo = 'Z001'), 'R002', 'RUTA SANTIAGO NORTE', 'Norte de Santiago'),
((SELECT id FROM zonas WHERE codigo = 'Z002'), 'R003', 'RUTA SD CENTRO', 'Centro de Santo Domingo'),
((SELECT id FROM zonas WHERE codigo = 'Z002'), 'R004', 'RUTA SD ESTE', 'Este de Santo Domingo'),
((SELECT id FROM zonas WHERE codigo = 'Z003'), 'R005', 'RUTA LA ROMANA', 'La Romana y alrededores'),
((SELECT id FROM zonas WHERE codigo = 'Z004'), 'R006', 'RUTA SAN JUAN', 'San Juan y alrededores');

-- Insertar categorías de productos
INSERT INTO categorias (codigo, nombre, descripcion, orden) VALUES
('CAT001', 'LACTEOS', 'Productos lácteos y derivados', 1),
('CAT002', 'CARNES', 'Carnes frescas y embutidos', 2),
('CAT003', 'PANADERIA', 'Pan y productos de panadería', 3),
('CAT004', 'BEBIDAS', 'Bebidas alcohólicas y no alcohólicas', 4),
('CAT005', 'LIMPIEZA', 'Productos de limpieza del hogar', 5),
('CAT006', 'CUIDADO PERSONAL', 'Productos de higiene y cuidado personal', 6),
('CAT007', 'SNACKS', 'Snacks y productos de confitería', 7),
('CAT008', 'CONGELADOS', 'Productos congelados', 8);

-- Insertar usuario administrador
INSERT INTO auth_users (email, nombre_completo, rol, activo) VALUES
('admin@edessa.com', 'Administrador del Sistema', 'admin', true);

-- Insertar supervisores de ejemplo
INSERT INTO auth_users (codigo, nombre_completo, rol, zona_id, activo) VALUES
('S001', 'MARIA RODRIGUEZ SUPERVISOR', 'supervisor', (SELECT id FROM zonas WHERE codigo = 'Z001'), true),
('S002', 'CARLOS MARTINEZ SUPERVISOR', 'supervisor', (SELECT id FROM zonas WHERE codigo = 'Z002'), true),
('S003', 'ANA GARCIA SUPERVISOR', 'supervisor', (SELECT id FROM zonas WHERE codigo = 'Z003'), true),
('S004', 'LUIS FERNANDEZ SUPERVISOR', 'supervisor', (SELECT id FROM zonas WHERE codigo = 'Z004'), true);

-- Insertar vendedores de ejemplo
WITH supervisor_z001 AS (SELECT id FROM auth_users WHERE codigo = 'S001'),
     supervisor_z002 AS (SELECT id FROM auth_users WHERE codigo = 'S002'),
     supervisor_z003 AS (SELECT id FROM auth_users WHERE codigo = 'S003'),
     supervisor_z004 AS (SELECT id FROM auth_users WHERE codigo = 'S004')
INSERT INTO auth_users (codigo, nombre_completo, rol, zona_id, supervisor_id, activo) VALUES
-- Zona Norte
('E001', '(PREV) PEDRO JOSE BURGOS', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z001'), (SELECT id FROM supervisor_z001), true),
('E002', '(PREV) MARIA ELENA SANTOS', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z001'), (SELECT id FROM supervisor_z001), true),
('E003', '(PREV) JOSE ANTONIO RAMIREZ', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z001'), (SELECT id FROM supervisor_z001), true),
-- Zona Sur
('E004', '(PREV) CARMEN LUCIA TORRES', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z002'), (SELECT id FROM supervisor_z002), true),
('E005', '(PREV) RAFAEL DOMINGO CRUZ', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z002'), (SELECT id FROM supervisor_z002), true),
('E006', '(PREV) YOLANDA MARIA JIMENEZ', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z002'), (SELECT id FROM supervisor_z002), true),
-- Zona Este
('E007', '(PREV) MIGUEL ANGEL VARGAS', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z003'), (SELECT id FROM supervisor_z003), true),
('E008', '(PREV) ROSA MARIA DELGADO', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z003'), (SELECT id FROM supervisor_z003), true),
-- Zona Oeste
('E009', '(PREV) FRANCISCO JAVIER MORA', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z004'), (SELECT id FROM supervisor_z004), true),
('E010', '(PREV) PATRICIA ISABEL HERRERA', 'vendedor', (SELECT id FROM zonas WHERE codigo = 'Z004'), (SELECT id FROM supervisor_z004), true);

-- Insertar registros en tabla vendedores basados en auth_users
INSERT INTO vendedores (user_id, codigo, nombre_completo, zona_id, supervisor_id, activo)
SELECT 
    au.id,
    au.codigo,
    au.nombre_completo,
    au.zona_id,
    au.supervisor_id,
    au.activo
FROM auth_users au
WHERE au.rol = 'vendedor';

-- Insertar clientes de ejemplo
INSERT INTO clientes (codigo, nombre, zona_id, ruta_id, direccion, telefono) VALUES
-- Zona Norte - Santiago
('CLI001', 'SUPERMERCADO LA ECONOMIA', (SELECT id FROM zonas WHERE codigo = 'Z001'), (SELECT id FROM rutas WHERE codigo = 'R001'), 'Calle Duarte #123, Santiago', '809-555-0001'),
('CLI002', 'COLMADO DONA MARIA', (SELECT id FROM zonas WHERE codigo = 'Z001'), (SELECT id FROM rutas WHERE codigo = 'R001'), 'Av. 27 de Febrero #456, Santiago', '809-555-0002'),
('CLI003', 'MINIMARKET EL AHORRO', (SELECT id FROM zonas WHERE codigo = 'Z001'), (SELECT id FROM rutas WHERE codigo = 'R002'), 'Calle del Sol #789, Santiago', '809-555-0003'),
('CLI004', 'SUPERMERCADO FAMILIAR', (SELECT id FROM zonas WHERE codigo = 'Z001'), (SELECT id FROM rutas WHERE codigo = 'R002'), 'Av. Estrella Sadhalá #321, Santiago', '809-555-0004'),

-- Zona Sur - Santo Domingo
('CLI005', 'SUPERMERCADO NACIONAL', (SELECT id FROM zonas WHERE codigo = 'Z002'), (SELECT id FROM rutas WHERE codigo = 'R003'), 'Av. Winston Churchill #654, Santo Domingo', '809-555-0005'),
('CLI006', 'COLMADO LA ESQUINA', (SELECT id FROM zonas WHERE codigo = 'Z002'), (SELECT id FROM rutas WHERE codigo = 'R003'), 'Calle José Martí #987, Santo Domingo', '809-555-0006'),
('CLI007', 'MINIMARKET CENTRAL', (SELECT id FROM zonas WHERE codigo = 'Z002'), (SELECT id FROM rutas WHERE codigo = 'R004'), 'Av. Abraham Lincoln #147, Santo Domingo', '809-555-0007'),
('CLI008', 'SUPERMERCADO PLAZA', (SELECT id FROM zonas WHERE codigo = 'Z002'), (SELECT id FROM rutas WHERE codigo = 'R004'), 'Calle Máximo Gómez #258, Santo Domingo', '809-555-0008'),

-- Zona Este - La Romana
('CLI009', 'SUPERMERCADO COSTA ESTE', (SELECT id FROM zonas WHERE codigo = 'Z003'), (SELECT id FROM rutas WHERE codigo = 'R005'), 'Av. Libertad #369, La Romana', '809-555-0009'),
('CLI010', 'COLMADO EL PUERTO', (SELECT id FROM zonas WHERE codigo = 'Z003'), (SELECT id FROM rutas WHERE codigo = 'R005'), 'Calle Duarte #741, La Romana', '809-555-0010'),

-- Zona Oeste - San Juan
('CLI011', 'MINIMARKET FRONTERA', (SELECT id FROM zonas WHERE codigo = 'Z004'), (SELECT id FROM rutas WHERE codigo = 'R006'), 'Av. Independencia #852, San Juan', '809-555-0011'),
('CLI012', 'SUPERMERCADO OESTE', (SELECT id FROM zonas WHERE codigo = 'Z004'), (SELECT id FROM rutas WHERE codigo = 'R006'), 'Calle Sánchez #963, San Juan', '809-555-0012');

-- Insertar asignaciones de ejemplo (vendedor-cliente-categoría)
-- Esto simula los datos que vendrían del Excel diario
INSERT INTO asignaciones (fecha_reporte, vendedor_id, cliente_id, categoria_id, estado_activacion, ventas_recientes) 
SELECT 
    CURRENT_DATE as fecha_reporte,
    v.id as vendedor_id,
    c.id as cliente_id,
    cat.id as categoria_id,
    CASE 
        WHEN RANDOM() < 0.3 THEN 'activado'
        WHEN RANDOM() < 0.8 THEN 'pendiente'
        ELSE 'no_aplica'
    END as estado_activacion,
    ROUND((RANDOM() * 1000)::numeric, 2) as ventas_recientes
FROM vendedores v
CROSS JOIN clientes c
CROSS JOIN categorias cat
WHERE c.zona_id = v.zona_id
AND RANDOM() < 0.7; -- No todos los vendedores tienen todas las categorías asignadas

-- Insertar algunos registros de importación de ejemplo
INSERT INTO import_runs (usuario_id, nombre_archivo, nombre_hoja, total_filas, filas_procesadas, filas_insertadas, estado, fecha_datos, completed_at)
VALUES 
((SELECT id FROM auth_users WHERE email = 'admin@edessa.com'), 
 'clientes_sin_ventas_2024_01_15.xlsx', 
 'CLIENTES SIN VENT MULTICATEGORI', 
 150, 150, 150, 
 'completado', 
 CURRENT_DATE - INTERVAL '1 day',
 NOW() - INTERVAL '1 day'),
((SELECT id FROM auth_users WHERE email = 'admin@edessa.com'), 
 'clientes_sin_ventas_2024_01_16.xlsx', 
 'CLIENTES SIN VENT MULTICATEGORI', 
 148, 148, 148, 
 'completado', 
 CURRENT_DATE,
 NOW() - INTERVAL '2 hours');

-- Refrescar las vistas materializadas con los datos iniciales
SELECT refresh_materialized_views();

-- =====================================================
-- VERIFICACIONES DE INTEGRIDAD
-- =====================================================

-- Verificar que todos los vendedores tienen zona asignada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM vendedores WHERE zona_id IS NULL) THEN
        RAISE EXCEPTION 'Error: Existen vendedores sin zona asignada';
    END IF;
END $$;

-- Verificar que todas las rutas pertenecen a una zona
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM rutas WHERE zona_id IS NULL) THEN
        RAISE EXCEPTION 'Error: Existen rutas sin zona asignada';
    END IF;
END $$;

-- Verificar que todos los clientes tienen zona y ruta
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM clientes WHERE zona_id IS NULL OR ruta_id IS NULL) THEN
        RAISE EXCEPTION 'Error: Existen clientes sin zona o ruta asignada';
    END IF;
END $$;

-- =====================================================
-- ESTADÍSTICAS INICIALES
-- =====================================================

-- Mostrar resumen de datos insertados
SELECT 'RESUMEN DE DATOS INICIALES' as titulo;

SELECT 
    'Zonas' as tabla,
    COUNT(*) as registros
FROM zonas
UNION ALL
SELECT 
    'Rutas' as tabla,
    COUNT(*) as registros
FROM rutas
UNION ALL
SELECT 
    'Categorías' as tabla,
    COUNT(*) as registros
FROM categorias
UNION ALL
SELECT 
    'Usuarios' as tabla,
    COUNT(*) as registros
FROM auth_users
UNION ALL
SELECT 
    'Vendedores' as tabla,
    COUNT(*) as registros
FROM vendedores
UNION ALL
SELECT 
    'Clientes' as tabla,
    COUNT(*) as registros
FROM clientes
UNION ALL
SELECT 
    'Asignaciones' as tabla,
    COUNT(*) as registros
FROM asignaciones
ORDER BY tabla;

-- Mostrar distribución por rol
SELECT 
    'DISTRIBUCIÓN POR ROL' as titulo,
    rol,
    COUNT(*) as cantidad
FROM auth_users
GROUP BY rol
ORDER BY rol;

-- Mostrar distribución por zona
SELECT 
    'DISTRIBUCIÓN POR ZONA' as titulo,
    z.nombre as zona,
    COUNT(DISTINCT v.id) as vendedores,
    COUNT(DISTINCT c.id) as clientes
FROM zonas z
LEFT JOIN vendedores v ON z.id = v.zona_id
LEFT JOIN clientes c ON z.id = c.zona_id
GROUP BY z.id, z.nombre
ORDER BY z.nombre;
