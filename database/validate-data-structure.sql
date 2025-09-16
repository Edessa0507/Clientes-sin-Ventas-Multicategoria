-- Script para validar estructura de datos y problemas identificados
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar estructura de tabla asignaciones
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'asignaciones' 
ORDER BY ordinal_position;

-- 2. Verificar datos de supervisores en asignaciones
SELECT DISTINCT 
    supervisor_codigo,
    supervisor_nombre,
    COUNT(*) as total_asignaciones
FROM asignaciones 
WHERE supervisor_codigo IS NOT NULL 
GROUP BY supervisor_codigo, supervisor_nombre
ORDER BY supervisor_codigo;

-- 3. Buscar específicamente el supervisor CVALDEZ
SELECT 
    supervisor_codigo,
    supervisor_nombre,
    vendedor_codigo,
    vendedor_nombre,
    COUNT(*) as asignaciones
FROM asignaciones 
WHERE supervisor_codigo ILIKE '%CVALDEZ%' 
   OR supervisor_nombre ILIKE '%CARLOS VALDEZ%'
GROUP BY supervisor_codigo, supervisor_nombre, vendedor_codigo, vendedor_nombre
ORDER BY supervisor_codigo, vendedor_codigo;

-- 4. Verificar rutas únicas en asignaciones
SELECT DISTINCT 
    ruta_codigo,
    ruta_nombre,
    COUNT(*) as total_asignaciones
FROM asignaciones 
WHERE ruta_codigo IS NOT NULL 
  AND ruta_nombre IS NOT NULL
GROUP BY ruta_codigo, ruta_nombre
ORDER BY ruta_codigo;

-- 5. Verificar tabla rutas (si existe)
SELECT COUNT(*) as total_rutas FROM rutas;

-- 6. Verificar vendedores para supervisor CVALDEZ
SELECT DISTINCT 
    vendedor_codigo,
    vendedor_nombre,
    supervisor_codigo,
    supervisor_nombre,
    ruta_codigo,
    ruta_nombre
FROM asignaciones 
WHERE supervisor_codigo ILIKE '%CVALDEZ%' 
   OR supervisor_nombre ILIKE '%CARLOS VALDEZ%'
ORDER BY vendedor_codigo;

-- 7. Verificar datos del vendedor E56 (que funciona)
SELECT 
    vendedor_codigo,
    vendedor_nombre,
    supervisor_codigo,
    supervisor_nombre,
    COUNT(*) as total_asignaciones
FROM asignaciones 
WHERE vendedor_codigo = 'E56'
GROUP BY vendedor_codigo, vendedor_nombre, supervisor_codigo, supervisor_nombre;

-- 8. Verificar si hay problemas de codificación en supervisor_codigo
SELECT DISTINCT 
    supervisor_codigo,
    LENGTH(supervisor_codigo) as longitud,
    ASCII(LEFT(supervisor_codigo, 1)) as primer_caracter_ascii,
    supervisor_nombre
FROM asignaciones 
WHERE supervisor_codigo IS NOT NULL
ORDER BY supervisor_codigo;

-- 9. Verificar total de registros por tabla
SELECT 'asignaciones' as tabla, COUNT(*) as total FROM asignaciones
UNION ALL
SELECT 'rutas' as tabla, COUNT(*) as total FROM rutas
UNION ALL
SELECT 'vendedores' as tabla, COUNT(*) as total FROM vendedores
UNION ALL
SELECT 'supervisores' as tabla, COUNT(*) as total FROM supervisores;

-- 10. Verificar últimas importaciones
SELECT 
    fecha_importacion,
    registros_procesados,
    registros_exitosos,
    registros_fallidos
FROM importaciones 
ORDER BY fecha_importacion DESC 
LIMIT 5;
