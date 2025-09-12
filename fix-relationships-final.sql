-- SQL FINAL - Corregir relaciones con columnas correctas
-- Ejecutar en Supabase SQL Editor

-- 1. Recrear tabla asignaciones con FK correcta
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- FK correcta: vendedor_codigo -> auth_users.codigo
    CONSTRAINT fk_asignaciones_vendedor 
        FOREIGN KEY (vendedor_codigo) 
        REFERENCES auth_users(codigo) 
        ON DELETE CASCADE,
    CONSTRAINT fk_asignaciones_categoria 
        FOREIGN KEY (categoria_nombre) 
        REFERENCES categorias(categoria_nombre) 
        ON DELETE CASCADE,
    CONSTRAINT fk_asignaciones_cliente 
        FOREIGN KEY (cliente_id) 
        REFERENCES clientes(cliente_id) 
        ON DELETE CASCADE
);

-- 2. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha ON asignaciones(fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_asignaciones_vendedor ON asignaciones(vendedor_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_cliente ON asignaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_categoria ON asignaciones(categoria_nombre);

-- 3. Habilitar RLS con política permisiva
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en asignaciones" ON asignaciones;
CREATE POLICY "Permitir todo en asignaciones" ON asignaciones FOR ALL USING (true);

-- 4. Trigger para updated_at
DROP TRIGGER IF EXISTS update_asignaciones_updated_at ON asignaciones;
CREATE TRIGGER update_asignaciones_updated_at 
    BEFORE UPDATE ON asignaciones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Asegurar RLS permisivo en tablas relacionadas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en clientes" ON clientes;
CREATE POLICY "Permitir todo en clientes" ON clientes FOR ALL USING (true);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en categorias" ON categorias;
CREATE POLICY "Permitir todo en categorias" ON categorias FOR ALL USING (true);

-- 6. Reinsertar categorías básicas
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

-- 7. Función para importar datos con FK automáticas
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
    
    -- Verificar que el vendedor existe en auth_users
    IF NOT EXISTS (SELECT 1 FROM auth_users WHERE codigo = p_vendedor_codigo) THEN
        RAISE EXCEPTION 'Vendedor con código % no existe en auth_users', p_vendedor_codigo;
    END IF;
    
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

-- 8. Insertar vendedores de ejemplo (ajustar según tus datos)
INSERT INTO auth_users (codigo, email, nombre_completo, rol, activo) VALUES 
    ('E56', 'pedro.burgos@edessa.do', 'PEDRO JOSE BURGOS', 'vendedor', true),
    ('ADMIN001', 'gustavo.reyes@edessa.do', 'GUSTAVO REYES', 'admin', true)
ON CONFLICT (codigo) DO NOTHING;
