-- Script para limpiar supervisores duplicados y mal formateados
-- Ejecutar en Supabase SQL Editor

-- 1. Ver todos los supervisores actuales
SELECT id, codigo, nombre_completo, email, activo, created_at 
FROM supervisores 
ORDER BY nombre_completo, created_at;

-- 2. Eliminar supervisores duplicados con emails mal formateados
-- Mantener solo los supervisores con emails correctos
DELETE FROM supervisores 
WHERE email LIKE '%.%.%@edessa.do' 
AND email NOT IN (
    'cvaldez@edessa.com.do',
    'ismael.zorrilla@edessa.do', 
    'severo.escalante@edessa.do'
);

-- 3. Eliminar supervisores con códigos duplicados, manteniendo los más antiguos
DELETE FROM supervisores s1
WHERE EXISTS (
    SELECT 1 FROM supervisores s2 
    WHERE s2.codigo = s1.codigo 
    AND s2.created_at < s1.created_at
    AND s2.email IN (
        'cvaldez@edessa.com.do',
        'ismael.zorrilla@edessa.do', 
        'severo.escalante@edessa.do'
    )
);

-- 4. Verificar supervisores finales
SELECT codigo, nombre_completo, email, activo 
FROM supervisores 
ORDER BY codigo;

-- 5. Contar supervisores
SELECT COUNT(*) as total_supervisores FROM supervisores;
