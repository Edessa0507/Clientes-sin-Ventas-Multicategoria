-- Consultas de diagnóstico para investigar problemas de importación y login

-- 1. Verificar estructura de tabla asignaciones
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'asignaciones' 
ORDER BY ordinal_position;

-- 2. Contar registros en asignaciones
SELECT COUNT(*) as total_asignaciones FROM asignaciones;

-- 3. Ver muestra de datos importados
SELECT supervisor_codigo, vendedor_codigo, cliente_codigo, categoria_codigo, estado, fecha
FROM asignaciones 
LIMIT 10;

-- 4. Verificar códigos únicos de vendedores en asignaciones
SELECT DISTINCT vendedor_codigo, vendedor_nombre
FROM asignaciones 
WHERE vendedor_codigo IS NOT NULL
ORDER BY vendedor_codigo;

-- 5. Verificar códigos únicos de supervisores en asignaciones  
SELECT DISTINCT supervisor_codigo, supervisor_nombre
FROM asignaciones 
WHERE supervisor_codigo IS NOT NULL
ORDER BY supervisor_codigo;

-- 6. Verificar tabla vendedores
SELECT * FROM vendedores ORDER BY codigo;

-- 7. Verificar tabla supervisores
SELECT * FROM supervisores ORDER BY codigo;

-- 8. Verificar políticas RLS en asignaciones
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'asignaciones';

-- 9. Verificar políticas RLS en importaciones
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'importaciones';

-- 10. Verificar estructura de tabla importaciones
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'importaciones' 
ORDER BY ordinal_position;

-- 11. Contar registros por categoría
SELECT categoria_codigo, COUNT(*) as total
FROM asignaciones 
GROUP BY categoria_codigo
ORDER BY total DESC;

-- 12. Verificar si hay errores en el procesamiento
SELECT supervisor_codigo, vendedor_codigo, cliente_codigo, 
       CASE 
         WHEN supervisor_codigo IS NULL THEN 'supervisor_codigo NULL'
         WHEN vendedor_codigo IS NULL THEN 'vendedor_codigo NULL'
         WHEN cliente_codigo IS NULL THEN 'cliente_codigo NULL'
         ELSE 'OK'
       END as status
FROM asignaciones 
WHERE supervisor_codigo IS NULL OR vendedor_codigo IS NULL OR cliente_codigo IS NULL
LIMIT 5;
