-- Script para crear vendedores y supervisores automáticamente desde datos importados
-- Ejecutar después de la importación para permitir login

-- Crear vendedores únicos desde asignaciones
INSERT INTO vendedores (id, codigo, nombre_completo, activo, created_at)
SELECT 
    gen_random_uuid() as id,
    vendedor_codigo as codigo,
    vendedor_nombre as nombre_completo,
    true as activo,
    NOW() as created_at
FROM (
    SELECT DISTINCT vendedor_codigo, vendedor_nombre
    FROM asignaciones 
    WHERE vendedor_codigo IS NOT NULL 
    AND vendedor_codigo != ''
    AND vendedor_nombre IS NOT NULL
) unique_vendedores
ON CONFLICT (codigo) DO NOTHING;

-- Crear supervisores únicos desde asignaciones
INSERT INTO supervisores (id, codigo, nombre_completo, activo, created_at)
SELECT 
    gen_random_uuid() as id,
    supervisor_codigo as codigo,
    supervisor_nombre as nombre_completo,
    true as activo,
    NOW() as created_at
FROM (
    SELECT DISTINCT supervisor_codigo, supervisor_nombre
    FROM asignaciones 
    WHERE supervisor_codigo IS NOT NULL 
    AND supervisor_codigo != ''
    AND supervisor_nombre IS NOT NULL
) unique_supervisores
ON CONFLICT (codigo) DO NOTHING;

-- Verificar vendedores creados
SELECT 'Vendedores creados:' as tipo, COUNT(*) as total FROM vendedores;

-- Verificar supervisores creados  
SELECT 'Supervisores creados:' as tipo, COUNT(*) as total FROM supervisores;

-- Mostrar algunos ejemplos
SELECT 'Vendedores:' as tipo, codigo, nombre_completo FROM vendedores LIMIT 5;
SELECT 'Supervisores:' as tipo, codigo, nombre_completo FROM supervisores LIMIT 5;
