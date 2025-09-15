-- Script final para limpiar supervisores duplicados
-- Ejecutar en Supabase SQL Editor

-- Eliminar supervisores con emails mal formateados
DELETE FROM supervisores 
WHERE email LIKE '%..%' 
   OR email LIKE '%.(%'
   OR email LIKE '%).%';

-- Verificar resultado
SELECT codigo, nombre_completo, email, activo 
FROM supervisores 
ORDER BY codigo;
