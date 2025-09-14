-- Script para corregir constraints NOT NULL en tabla asignaciones
-- Hacer columnas UUID opcionales para permitir importación con datos desnormalizados

-- Hacer columnas UUID opcionales (nullable)
ALTER TABLE asignaciones 
ALTER COLUMN cliente_id DROP NOT NULL,
ALTER COLUMN categoria_id DROP NOT NULL,
ALTER COLUMN vendedor_id DROP NOT NULL,
ALTER COLUMN supervisor_id DROP NOT NULL;

-- Verificar la estructura actualizada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'asignaciones' 
AND column_name IN ('cliente_id', 'categoria_id', 'vendedor_id', 'supervisor_id')
ORDER BY ordinal_position;
