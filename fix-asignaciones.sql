-- Corregir estructura de tabla asignaciones para importación Excel
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar tabla existente si tiene datos incorrectos
DROP TABLE IF EXISTS asignaciones CASCADE;

-- 2. Recrear tabla con estructura correcta
CREATE TABLE asignaciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha_reporte DATE NOT NULL,
    vendedor_codigo VARCHAR(20) NOT NULL,
    cliente_id INTEGER NOT NULL,
    categoria_nombre VARCHAR(100) NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('ACTIVADO', 'FALTA', '0')) NOT NULL,
    supervisor_nombre VARCHAR(255),
    ruta VARCHAR(100),
    zona VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Claves foráneas
    FOREIGN KEY (cliente_id) REFERENCES clientes(cliente_id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_nombre) REFERENCES categorias(categoria_nombre) ON DELETE CASCADE,
    FOREIGN KEY (vendedor_codigo) REFERENCES auth_users(vendedor_codigo) ON DELETE CASCADE
);

-- 3. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha ON asignaciones(fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_asignaciones_vendedor ON asignaciones(vendedor_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_cliente ON asignaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_categoria ON asignaciones(categoria_nombre);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS básicas (sin restricciones por ahora)
CREATE POLICY "Permitir todo en asignaciones" ON asignaciones FOR ALL USING (true);

-- 6. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_asignaciones_updated_at 
    BEFORE UPDATE ON asignaciones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
