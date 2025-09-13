-- Corregir relaciones de base de datos para que funcionen los dashboards
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar estructuras actuales
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categorias' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'auth_users' 
ORDER BY ordinal_position;

-- 2. Recrear tabla asignaciones con estructura correcta y relaciones
DROP TABLE IF EXISTS asignaciones CASCADE;

CREATE TABLE asignaciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha_reporte DATE NOT NULL,
    vendedor_codigo VARCHAR(20) NOT NULL,
    cliente_codigo VARCHAR(50) NOT NULL,
    categoria_codigo VARCHAR(50) NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('ACTIVADO', 'FALTA', '0')) NOT NULL,
    supervisor_nombre VARCHAR(255),
    ruta VARCHAR(100),
    zona VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha ON asignaciones(fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_asignaciones_vendedor ON asignaciones(vendedor_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_cliente ON asignaciones(cliente_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_categoria ON asignaciones(categoria_codigo);

-- 4. Habilitar RLS con política permisiva
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en asignaciones" ON asignaciones;
CREATE POLICY "Permitir todo en asignaciones" ON asignaciones FOR ALL USING (true);

-- 5. Trigger para updated_at
DROP TRIGGER IF EXISTS update_asignaciones_updated_at ON asignaciones;
CREATE TRIGGER update_asignaciones_updated_at 
    BEFORE UPDATE ON asignaciones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Asegurar que las tablas relacionadas tengan RLS permisivo
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en clientes" ON clientes;
CREATE POLICY "Permitir todo en clientes" ON clientes FOR ALL USING (true);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en categorias" ON categorias;
CREATE POLICY "Permitir todo en categorias" ON categorias FOR ALL USING (true);

ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en auth_users" ON auth_users;
CREATE POLICY "Permitir todo en auth_users" ON auth_users FOR ALL USING (true);

-- 7. Insertar datos de prueba si es necesario
-- (Descomentar si se necesitan datos de prueba)
/*
INSERT INTO asignaciones (fecha_reporte, vendedor_codigo, cliente_codigo, categoria_codigo, estado, supervisor_nombre, ruta, zona) VALUES
    ('2024-01-15', 'E56', 'CLI001', 'CAT001', 'ACTIVADO', 'Supervisor 1', '1L', 'NORTE'),
    ('2024-01-15', 'E56', 'CLI002', 'CAT002', 'FALTA', 'Supervisor 1', '1L', 'NORTE'),
    ('2024-01-15', 'E57', 'CLI003', 'CAT001', '0', 'Supervisor 2', '2L', 'SUR');
*/
INSERT INTO categorias (categoria_nombre) VALUES 
    ('ENSURE'),
    ('CHOCOLATE'),
    ('ALPINA'),
    ('SUPER DE ALIM.'),
    ('CONDICIONATE'),
    ('BEBIDAS'),
    ('LACTEOS'),
    ('CEREALES')
ON CONFLICT (categoria_nombre) DO NOTHING;

-- 7. Crear función para importar datos que maneje las FK automáticamente
CREATE OR REPLACE FUNCTION import_asignacion(
    p_fecha_reporte DATE,
    p_vendedor_codigo VARCHAR(20),
    p_cliente_id INTEGER,
    p_cliente_nombre VARCHAR(255),
    p_categoria_nombre VARCHAR(100),
    p_estado VARCHAR(20),
    p_supervisor_nombre VARCHAR(255) DEFAULT NULL,
    p_ruta VARCHAR(100) DEFAULT NULL,
    p_zona VARCHAR(50) DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    asignacion_id UUID;
BEGIN
    -- Insertar cliente si no existe
    INSERT INTO clientes (cliente_id, cliente_nombre)
    VALUES (p_cliente_id, p_cliente_nombre)
    ON CONFLICT (cliente_id) DO NOTHING;
    
    -- Insertar categoría si no existe
    INSERT INTO categorias (categoria_nombre)
    VALUES (p_categoria_nombre)
    ON CONFLICT (categoria_nombre) DO NOTHING;
    
    -- Insertar asignación
    INSERT INTO asignaciones (
        fecha_reporte, vendedor_codigo, cliente_id, categoria_nombre,
        estado, supervisor_nombre, ruta, zona
    ) VALUES (
        p_fecha_reporte, p_vendedor_codigo, p_cliente_id, p_categoria_nombre,
        p_estado, p_supervisor_nombre, p_ruta, p_zona
    ) RETURNING id INTO asignacion_id;
    
    RETURN asignacion_id;
END;
$$;
