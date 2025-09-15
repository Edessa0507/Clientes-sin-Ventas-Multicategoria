-- Script simple para limpiar supervisores duplicados
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar supervisores con emails mal formateados (contienen puntos extras)
DELETE FROM supervisores 
WHERE email LIKE '%..%' OR email LIKE '%.(%';

-- 2. Verificar supervisores restantes
SELECT codigo, nombre_completo, email, activo 
FROM supervisores 
ORDER BY codigo;

-- 3. Contar total
SELECT COUNT(*) as total_supervisores FROM supervisores;
