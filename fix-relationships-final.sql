-- SQL FINAL - Corregir relaciones con columnas correctas
-- Ejecutar en Supabase SQL Editor

-- 1. Recrear tabla asignaciones con FK correcta
DROP TABLE IF EXISTS asignaciones CASCADE;

-- 2. Crear tabla asignaciones con foreign keys que apunten a las columnas correctas
CREATE TABLE asignaciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha_reporte DATE NOT NULL,
    vendedor_codigo VARCHAR(20) NOT NULL,
    cliente_codigo VARCHAR(50) NOT NULL REFERENCES clientes(codigo),
    categoria_codigo VARCHAR(50) NOT NULL REFERENCES categorias(codigo),
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

-- 7. Insertar algunas categorías básicas si no existen
INSERT INTO categorias (codigo, nombre, activa) VALUES 
    ('ENS', 'ENSURE', true),
    ('CHO', 'CHOCOLATE', true),
    ('ALP', 'ALPINA', true),
    ('SUP', 'SUPER DE ALIM.', true),
    ('CON', 'CONDICIONATE', true),
    ('BEB', 'BEBIDAS', true),
    ('LAC', 'LACTEOS', true),
    ('CER', 'CEREALES', true)
ON CONFLICT (codigo) DO NOTHING;

-- 8. Función corregida para importar datos
CREATE OR REPLACE FUNCTION import_asignacion(
    p_fecha_reporte DATE,
    p_vendedor_codigo VARCHAR(20),
    p_cliente_codigo VARCHAR(50),
    p_cliente_nombre VARCHAR(255),
    p_categoria_codigo VARCHAR(50),
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
    INSERT INTO clientes (codigo, nombre, activo)
    VALUES (p_cliente_codigo, p_cliente_nombre, true)
    ON CONFLICT (codigo) DO NOTHING;
    
    -- Insertar categoría si no existe
    INSERT INTO categorias (codigo, nombre, activa)
    VALUES (p_categoria_codigo, p_categoria_nombre, true)
    ON CONFLICT (codigo) DO NOTHING;
    
    -- Insertar asignación
    INSERT INTO asignaciones (
        fecha_reporte, vendedor_codigo, cliente_codigo, categoria_codigo,
        estado, supervisor_nombre, ruta, zona
    ) VALUES (
        p_fecha_reporte, p_vendedor_codigo, p_cliente_codigo, p_categoria_codigo,
        p_estado, p_supervisor_nombre, p_ruta, p_zona
    ) RETURNING id INTO asignacion_id;
    
    RETURN asignacion_id;
END;
$$;

-- 9. Insertar algunos datos de prueba para verificar que funciona
INSERT INTO clientes (codigo, nombre, activo) VALUES 
    ('CLI001', 'Cliente Prueba 1', true),
    ('CLI002', 'Cliente Prueba 2', true),
    ('CLI003', 'Cliente Prueba 3', true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO asignaciones (fecha_reporte, vendedor_codigo, cliente_codigo, categoria_codigo, estado, supervisor_nombre, ruta, zona) VALUES
    ('2024-01-15', 'E56', 'CLI001', 'ENS', 'ACTIVADO', 'Supervisor 1', '1L', 'NORTE'),
    ('2024-01-15', 'E56', 'CLI002', 'CHO', 'FALTA', 'Supervisor 1', '1L', 'NORTE'),
    ('2024-01-15', 'E57', 'CLI003', 'ALP', '0', 'Supervisor 2', '2L', 'SUR')
ON CONFLICT DO NOTHING;

-- 8. Insertar vendedores de ejemplo (ajustar según tus datos)
INSERT INTO auth_users (codigo, email, nombre_completo, rol, activo) VALUES 
    ('E56', 'pedro.burgos@edessa.do', 'PEDRO JOSE BURGOS', 'vendedor', true),
    ('ADMIN001', 'gustavo.reyes@edessa.do', 'GUSTAVO REYES', 'admin', true)
ON CONFLICT (codigo) DO NOTHING;
