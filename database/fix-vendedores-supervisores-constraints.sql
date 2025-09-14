-- Script para corregir constraints NOT NULL en tablas vendedores y supervisores
-- Hacer zona_id y supervisor_id opcionales

-- Hacer zona_id opcional en vendedores
ALTER TABLE vendedores 
ALTER COLUMN zona_id DROP NOT NULL;

-- Hacer zona_id opcional en supervisores  
ALTER TABLE supervisores 
ALTER COLUMN zona_id DROP NOT NULL;

-- Hacer supervisor_id opcional en vendedores (si existe)
ALTER TABLE vendedores 
ALTER COLUMN supervisor_id DROP NOT NULL;

-- Verificar cambios
SELECT table_name, column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('vendedores', 'supervisores') 
AND column_name IN ('zona_id', 'supervisor_id')
ORDER BY table_name, column_name;
