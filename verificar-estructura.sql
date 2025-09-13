-- VERIFICAR ESTRUCTURA REAL DE LAS TABLAS
-- Ejecutar este SQL primero para ver qué columnas existen

-- 1. Ver estructura de tabla clientes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Ver estructura de tabla categorias  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'categorias' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Ver estructura de tabla auth_users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'auth_users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Ver estructura actual de tabla asignaciones (si existe)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'asignaciones' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Ver algunos datos de ejemplo de clientes (primeras 5 filas)
SELECT * FROM clientes LIMIT 5;

-- 6. Ver algunos datos de ejemplo de categorias (primeras 5 filas)
SELECT * FROM categorias LIMIT 5;
