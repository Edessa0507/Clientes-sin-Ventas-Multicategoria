-- Corregir relaciones de base de datos - VERSION CORREGIDA
-- Ejecutar en Supabase SQL Editor

-- 1. Recrear tabla asignaciones con FK correcta usando estructura real
DROP TABLE IF EXISTS asignaciones CASCADE;

-- 2. Crear tabla asignaciones con foreign keys que apunten a las columnas reales
-- Basándome en que categorias usa categoria_id, asumo que clientes usa cliente_id
CREATE TABLE asignaciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha_reporte DATE NOT NULL,
    vendedor_codigo VARCHAR(20) NOT NULL,
    cliente_id INTEGER NOT NULL REFERENCES clientes(cliente_id),
    categoria_id INTEGER NOT NULL REFERENCES categorias(categoria_id),
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
CREATE INDEX IF NOT EXISTS idx_asignaciones_cliente ON asignaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_categoria ON asignaciones(categoria_id);

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

-- 7. Reinsertar categorías básicas
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

-- 7. Función corregida para importar datos con estructura real
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
    categoria_id_found INTEGER;
BEGIN
    -- Insertar cliente si no existe
    INSERT INTO clientes (cliente_id, cliente_nombre)
    VALUES (p_cliente_id, p_cliente_nombre)
    ON CONFLICT (cliente_id) DO NOTHING;
    
    -- Buscar o insertar categoría
    SELECT categoria_id INTO categoria_id_found 
    FROM categorias 
    WHERE categoria_nombre = p_categoria_nombre;
    
    IF categoria_id_found IS NULL THEN
        INSERT INTO categorias (categoria_nombre)
        VALUES (p_categoria_nombre)
        RETURNING categoria_id INTO categoria_id_found;
    END IF;
    
    -- Insertar asignación
    INSERT INTO asignaciones (
        fecha_reporte, vendedor_codigo, cliente_id, categoria_id,
        estado, supervisor_nombre, ruta, zona
    ) VALUES (
        p_fecha_reporte, p_vendedor_codigo, p_cliente_id, categoria_id_found,
        p_estado, p_supervisor_nombre, p_ruta, p_zona
    ) RETURNING id INTO asignacion_id;
    
    RETURN asignacion_id;
END;
$$;

-- 8. Insertar algunos datos de prueba para verificar que funciona
-- Usando IDs de categorías que existen según tu consulta
INSERT INTO asignaciones (fecha_reporte, vendedor_codigo, cliente_id, categoria_id, estado, supervisor_nombre, ruta, zona) VALUES
    ('2024-01-15', 'E56', 1, 1, 'ACTIVADO', 'Supervisor 1', '1L', 'NORTE'),
    ('2024-01-15', 'E56', 2, 30, 'FALTA', 'Supervisor 1', '1L', 'NORTE'),
    ('2024-01-15', 'E57', 3, 31, '0', 'Supervisor 2', '2L', 'SUR')
ON CONFLICT DO NOTHING;

-- 9. OPCIONAL: Agregar claves foráneas después si las tablas tienen las columnas correctas
-- Descomenta estas líneas SOLO si auth_users tiene la columna correcta:

-- ALTER TABLE asignaciones ADD CONSTRAINT fk_asignaciones_categoria 
--     FOREIGN KEY (categoria_nombre) REFERENCES categorias(categoria_nombre) ON DELETE CASCADE;

-- ALTER TABLE asignaciones ADD CONSTRAINT fk_asignaciones_cliente 
--     FOREIGN KEY (cliente_id) REFERENCES clientes(cliente_id) ON DELETE CASCADE;

-- Si auth_users usa 'codigo' en lugar de 'vendedor_codigo':
-- ALTER TABLE asignaciones ADD CONSTRAINT fk_asignaciones_vendedor 
--     FOREIGN KEY (vendedor_codigo) REFERENCES auth_users(codigo) ON DELETE CASCADE;
