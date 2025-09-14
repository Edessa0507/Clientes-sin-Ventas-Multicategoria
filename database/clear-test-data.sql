-- Script para limpiar datos de prueba antes de usar datos reales
-- EJECUTAR SOLO CUANDO ESTÉ LISTO PARA DATOS REALES

-- Limpiar asignaciones
DELETE FROM asignaciones;

-- Limpiar clientes de prueba
DELETE FROM clientes WHERE codigo IN ('61842', '75599', '96832', '80188', '35663');

-- Limpiar vendedores de prueba
DELETE FROM vendedores WHERE codigo IN ('E56', 'E81', 'E02');

-- Limpiar supervisores de prueba
DELETE FROM supervisores WHERE codigo IN ('SUP01', 'SUP02', 'SUP03');

-- Limpiar zonas de prueba
DELETE FROM zonas WHERE codigo IN ('ZONA01', 'ZONA02', 'ZONA03');

-- Limpiar categorías de prueba
DELETE FROM categorias WHERE codigo IN ('ENSURE', 'CHOCOLATE', 'ALPINA', 'SUPER_ALIM');

-- Limpiar tabla de importaciones
DELETE FROM importaciones;

-- Verificar que las tablas están limpias
SELECT 'Clientes restantes:' as tabla, COUNT(*) as total FROM clientes
UNION ALL
SELECT 'Vendedores restantes:', COUNT(*) FROM vendedores
UNION ALL
SELECT 'Supervisores restantes:', COUNT(*) FROM supervisores
UNION ALL
SELECT 'Zonas restantes:', COUNT(*) FROM zonas
UNION ALL
SELECT 'Categorías restantes:', COUNT(*) FROM categorias
UNION ALL
SELECT 'Asignaciones restantes:', COUNT(*) FROM asignaciones
UNION ALL
SELECT 'Importaciones restantes:', COUNT(*) FROM importaciones;
