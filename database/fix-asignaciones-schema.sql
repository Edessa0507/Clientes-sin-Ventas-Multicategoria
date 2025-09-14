-- Script para corregir la estructura de la tabla asignaciones
-- Basado en la estructura real del Excel: SUPERVISOR | VENDEDOR | RUTA | CLIENTE | ENSURE | CHOCOLATE | ALPINA | SUPER DE ALIM. | CONDICIONATE

-- Agregar columnas según estructura real del Excel
ALTER TABLE asignaciones 
ADD COLUMN IF NOT EXISTS supervisor_codigo VARCHAR(50),
ADD COLUMN IF NOT EXISTS supervisor_nombre VARCHAR(200),
ADD COLUMN IF NOT EXISTS vendedor_codigo VARCHAR(20),
ADD COLUMN IF NOT EXISTS vendedor_nombre VARCHAR(200),
ADD COLUMN IF NOT EXISTS ruta_codigo VARCHAR(20),
ADD COLUMN IF NOT EXISTS ruta_nombre VARCHAR(200),
ADD COLUMN IF NOT EXISTS cliente_codigo VARCHAR(50),
ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(200),
ADD COLUMN IF NOT EXISTS categoria_codigo VARCHAR(50),
ADD COLUMN IF NOT EXISTS categoria_nombre VARCHAR(200),
ADD COLUMN IF NOT EXISTS fecha DATE DEFAULT CURRENT_DATE;

-- Crear índices para mejorar rendimiento en consultas
CREATE INDEX IF NOT EXISTS idx_asignaciones_supervisor_codigo ON asignaciones(supervisor_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_vendedor_codigo ON asignaciones(vendedor_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_cliente_codigo ON asignaciones(cliente_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_categoria_codigo ON asignaciones(categoria_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha ON asignaciones(fecha);

-- Verificar la estructura actualizada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'asignaciones' 
ORDER BY ordinal_position;
