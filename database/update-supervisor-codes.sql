-- Script para actualizar códigos de supervisor en la aplicación
-- Los códigos reales encontrados en la base de datos son:

-- SUPERVISORES REALES:
-- CARLOS = CARLOS VALDEZ (Sto. Dom.) - 7 vendedores, 32968 asignaciones
-- ISMAEL = ISMAEL ZORRILLA (Sto. Dom.) - 6 vendedores, 31800 asignaciones  
-- SEVERO = SEVERO ESCALANTE (Sto. Dom.) - 7 vendedores, 39992 asignaciones

-- Probar las funciones con los códigos correctos:

-- 1. Probar con CARLOS (código correcto)
SELECT 'Función buscar_supervisor_flexible con CARLOS:' as test;
SELECT * FROM buscar_supervisor_flexible('CARLOS');

-- 2. Obtener vendedores de CARLOS
SELECT 'Vendedores de CARLOS:' as test;
SELECT * FROM obtener_vendedores_supervisor('CARLOS');

-- 3. Probar con ISMAEL
SELECT 'Vendedores de ISMAEL:' as test;
SELECT * FROM obtener_vendedores_supervisor('ISMAEL');

-- 4. Probar con SEVERO
SELECT 'Vendedores de SEVERO:' as test;
SELECT * FROM obtener_vendedores_supervisor('SEVERO');

-- 5. Verificar que las rutas están sincronizadas
SELECT COUNT(*) as total_rutas FROM rutas;
SELECT codigo, nombre FROM rutas ORDER BY codigo LIMIT 5;
