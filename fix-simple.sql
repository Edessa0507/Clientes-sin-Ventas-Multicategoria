-- SQL SIMPLIFICADO - Sin FK problemáticas
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar estructura de categorias
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categorias' 
ORDER BY ordinal_position;

-- 2. Verificar estructura de clientes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
ORDER BY ordinal_position;

-- 3. Recrear tabla asignaciones SIN claves foráneas
DROP TABLE IF EXISTS asignaciones CASCADE;

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha ON asignaciones(fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_asignaciones_vendedor ON asignaciones(vendedor_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_cliente ON asignaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_categoria ON asignaciones(categoria_nombre);

-- 5. Habilitar RLS con política permisiva
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en asignaciones" ON asignaciones;
CREATE POLICY "Permitir todo en asignaciones" ON asignaciones FOR ALL USING (true);

-- 6. Trigger para updated_at
DROP TRIGGER IF EXISTS update_asignaciones_updated_at ON asignaciones;
CREATE TRIGGER update_asignaciones_updated_at 
    BEFORE UPDATE ON asignaciones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Asegurar RLS permisivo en tablas relacionadas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en clientes" ON clientes;
CREATE POLICY "Permitir todo en clientes" ON clientes FOR ALL USING (true);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en categorias" ON categorias;
CREATE POLICY "Permitir todo en categorias" ON categorias FOR ALL USING (true);

-- 8. Función para importar datos SIN validaciones FK
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
    -- Insertar cliente si no existe (estructura real: codigo, nombre, zona_id, ruta_id opcionales)
    INSERT INTO clientes (codigo, nombre, activo)
    VALUES (p_cliente_id::text, p_cliente_nombre, true)
    ON CONFLICT (codigo) DO NOTHING;
    
    -- Insertar categoría si no existe (estructura real: codigo, nombre, activa)
    INSERT INTO categorias (codigo, nombre, activa)
    VALUES (p_categoria_nombre, p_categoria_nombre, true)
    ON CONFLICT (codigo) DO NOTHING;
    
    -- Insertar asignación SIN validaciones FK
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

-- 9. Insertar vendedores de ejemplo
INSERT INTO auth_users (codigo, email, nombre_completo, rol, activo) VALUES 
    ('E56', 'pedro.burgos@edessa.do', 'PEDRO JOSE BURGOS', 'vendedor', true),
    ('ADMIN001', 'gustavo.reyes@edessa.do', 'GUSTAVO REYES', 'admin', true)
ON CONFLICT (codigo) DO NOTHING;
