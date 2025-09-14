-- Script para crear TODOS los vendedores automáticamente desde datos importados
-- Ejecutar después de la importación completa de Excel

-- Crear vendedores únicos desde asignaciones (TODOS los registros)
INSERT INTO vendedores (id, codigo, nombre_completo, activo, created_at)
SELECT 
    gen_random_uuid() as id,
    UPPER(TRIM(vendedor_codigo)) as codigo,
    TRIM(vendedor_nombre) as nombre_completo,
    true as activo,
    NOW() as created_at
FROM (
    SELECT DISTINCT 
        vendedor_codigo, 
        vendedor_nombre
    FROM asignaciones 
    WHERE vendedor_codigo IS NOT NULL 
    AND vendedor_codigo != ''
    AND vendedor_nombre IS NOT NULL
    AND vendedor_nombre != ''
    AND LENGTH(TRIM(vendedor_codigo)) > 0
    AND LENGTH(TRIM(vendedor_nombre)) > 0
) unique_vendedores
ON CONFLICT (codigo) DO UPDATE SET
    nombre_completo = EXCLUDED.nombre_completo,
    activo = true,
    updated_at = NOW();

-- Verificar vendedores creados
SELECT 'Total vendedores creados:' as info, COUNT(*) as total FROM vendedores WHERE activo = true;

-- Mostrar algunos ejemplos
SELECT 'Ejemplos de vendedores:' as info, codigo, nombre_completo 
FROM vendedores 
WHERE activo = true 
ORDER BY codigo 
LIMIT 10;
