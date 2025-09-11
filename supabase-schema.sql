-- =============================================
-- ESQUEMA SQL PARA SUPABASE
-- Generador de Clientes sin Ventas Multicategoría
-- =============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLAS PRINCIPALES
-- =============================================

-- Tabla de usuarios autenticados
CREATE TABLE IF NOT EXISTS auth_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendedor_codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'supervisor', 'vendedor')) NOT NULL,
    zona VARCHAR(50),
    rutas TEXT[], -- Array de rutas asignadas
    email VARCHAR(255), -- Solo para admins
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    cliente_id INTEGER PRIMARY KEY,
    cliente_nombre VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
    categoria_id SERIAL PRIMARY KEY,
    categoria_nombre VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla principal de asignaciones
CREATE TABLE IF NOT EXISTS asignaciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha_reporte DATE NOT NULL,
    vendedor_codigo VARCHAR(20) NOT NULL,
    cliente_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('ACTIVADO', 'FALTA', '0')) NOT NULL,
    supervisor_nombre VARCHAR(255),
    ruta VARCHAR(100),
    zona VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Claves foráneas
    FOREIGN KEY (cliente_id) REFERENCES clientes(cliente_id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(categoria_id) ON DELETE CASCADE,
    FOREIGN KEY (vendedor_codigo) REFERENCES auth_users(vendedor_codigo) ON DELETE CASCADE
);

-- Tabla de registros de importación (opcional)
CREATE TABLE IF NOT EXISTS import_runs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha DATE NOT NULL,
    usuario_admin VARCHAR(255) NOT NULL,
    filas_procesadas INTEGER NOT NULL,
    hash_archivo VARCHAR(255),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

-- Índices principales para asignaciones
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha_vendedor 
ON asignaciones(fecha_reporte, vendedor_codigo);

CREATE INDEX IF NOT EXISTS idx_asignaciones_vendedor_cliente 
ON asignaciones(vendedor_codigo, cliente_id);

CREATE INDEX IF NOT EXISTS idx_asignaciones_zona_ruta 
ON asignaciones(zona, ruta);

CREATE INDEX IF NOT EXISTS idx_asignaciones_cliente 
ON asignaciones(cliente_id);

CREATE INDEX IF NOT EXISTS idx_asignaciones_categoria 
ON asignaciones(categoria_id);

-- Índices para otras tablas
CREATE INDEX IF NOT EXISTS idx_auth_users_codigo 
ON auth_users(vendedor_codigo);

CREATE INDEX IF NOT EXISTS idx_auth_users_rol_zona 
ON auth_users(rol, zona);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nombre 
ON categorias(categoria_nombre);

-- =============================================
-- FUNCIONES DE TRIGGER
-- =============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_auth_users_updated_at 
    BEFORE UPDATE ON auth_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at 
    BEFORE UPDATE ON clientes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at 
    BEFORE UPDATE ON categorias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asignaciones_updated_at 
    BEFORE UPDATE ON asignaciones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CONFIGURACIÓN RLS (ROW LEVEL SECURITY)
-- =============================================

-- Habilitar RLS en todas las tablas principales
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS PARA auth_users
-- =============================================

-- Los usuarios pueden ver su propia información
CREATE POLICY "Users can view own data" ON auth_users
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'authenticated' AND (
            -- Admin puede ver todos
            (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'admin'
            OR
            -- Supervisor puede ver vendedores de su zona
            (
                (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'supervisor'
                AND zona = (SELECT zona FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo')
            )
            OR
            -- Vendedor puede ver solo su información
            vendedor_codigo = auth.jwt() ->> 'vendedor_codigo'
        )
    );

-- Solo admins pueden insertar/actualizar usuarios
CREATE POLICY "Only admins can modify users" ON auth_users
    FOR ALL USING (
        (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'admin'
    );

-- =============================================
-- POLÍTICAS RLS PARA clientes
-- =============================================

-- Todos los usuarios autenticados pueden ver clientes
CREATE POLICY "Authenticated users can view clients" ON clientes
    FOR SELECT USING (auth.jwt() ->> 'role' = 'authenticated');

-- Solo admins pueden modificar clientes
CREATE POLICY "Only admins can modify clients" ON clientes
    FOR ALL USING (
        (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'admin'
    );

-- =============================================
-- POLÍTICAS RLS PARA categorias
-- =============================================

-- Todos los usuarios autenticados pueden ver categorías
CREATE POLICY "Authenticated users can view categories" ON categorias
    FOR SELECT USING (auth.jwt() ->> 'role' = 'authenticated');

-- Solo admins pueden modificar categorías
CREATE POLICY "Only admins can modify categories" ON categorias
    FOR ALL USING (
        (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'admin'
    );

-- =============================================
-- POLÍTICAS RLS PARA asignaciones (PRINCIPAL)
-- =============================================

-- Política de SELECT para asignaciones
CREATE POLICY "Users can view relevant assignments" ON asignaciones
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'authenticated' AND (
            -- Admin puede ver todas las asignaciones
            (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'admin'
            OR
            -- Supervisor puede ver asignaciones de su zona
            (
                (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'supervisor'
                AND zona = (SELECT zona FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo')
            )
            OR
            -- Vendedor solo puede ver sus propias asignaciones
            (
                (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'vendedor'
                AND vendedor_codigo = auth.jwt() ->> 'vendedor_codigo'
            )
        )
    );

-- Solo admins pueden insertar/actualizar/eliminar asignaciones
CREATE POLICY "Only admins can modify assignments" ON asignaciones
    FOR ALL USING (
        (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'admin'
    );

-- =============================================
-- POLÍTICAS RLS PARA import_runs
-- =============================================

-- Solo admins pueden ver y modificar registros de importación
CREATE POLICY "Only admins can access import runs" ON import_runs
    FOR ALL USING (
        (SELECT rol FROM auth_users WHERE vendedor_codigo = auth.jwt() ->> 'vendedor_codigo') = 'admin'
    );

-- =============================================
-- DATOS SEMILLA (SEEDS)
-- =============================================

-- Insertar categorías de ejemplo
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

-- Insertar usuarios de ejemplo
INSERT INTO auth_users (vendedor_codigo, nombre, rol, zona, rutas, email) VALUES 
    ('ADMIN', 'Administrador Sistema', 'admin', NULL, NULL, 'admin@empresa.com'),
    ('SUP01', 'Supervisor Zona Norte', 'supervisor', 'NORTE', ARRAY['1L', '2L', '3L'], NULL),
    ('SUP02', 'Supervisor Zona Sur', 'supervisor', 'SUR', ARRAY['4L', '5L', '6L'], NULL),
    ('E56', 'PEDRO JOSE BURGOS', 'vendedor', 'NORTE', ARRAY['1L'], NULL),
    ('E57', 'MARIA GONZALEZ LOPEZ', 'vendedor', 'NORTE', ARRAY['2L'], NULL),
    ('E58', 'CARLOS RODRIGUEZ PEREZ', 'vendedor', 'SUR', ARRAY['4L'], NULL)
ON CONFLICT (vendedor_codigo) DO NOTHING;

-- Insertar clientes de ejemplo
INSERT INTO clientes (cliente_id, cliente_nombre) VALUES 
    (61842, 'CASA NANDO'),
    (61843, 'SUPERMERCADO CENTRAL'),
    (61844, 'TIENDA LA ESQUINA'),
    (61845, 'MINIMERCADO FAMILIAR'),
    (61846, 'DISTRIBUIDORA NORTE')
ON CONFLICT (cliente_id) DO NOTHING;

-- Insertar asignaciones de ejemplo
INSERT INTO asignaciones (
    fecha_reporte, vendedor_codigo, cliente_id, categoria_id, 
    estado, supervisor_nombre, ruta, zona
) VALUES 
    (CURRENT_DATE, 'E56', 61842, 1, 'ACTIVADO', 'SUP01', '1L - Lunes 1x', 'NORTE'),
    (CURRENT_DATE, 'E56', 61842, 2, 'FALTA', 'SUP01', '1L - Lunes 1x', 'NORTE'),
    (CURRENT_DATE, 'E56', 61842, 3, '0', 'SUP01', '1L - Lunes 1x', 'NORTE'),
    (CURRENT_DATE, 'E56', 61843, 1, 'FALTA', 'SUP01', '1L - Lunes 1x', 'NORTE'),
    (CURRENT_DATE, 'E57', 61844, 1, 'ACTIVADO', 'SUP01', '2L - Martes 1x', 'NORTE'),
    (CURRENT_DATE, 'E58', 61845, 1, 'ACTIVADO', 'SUP02', '4L - Jueves 1x', 'SUR')
ON CONFLICT DO NOTHING;

-- =============================================
-- VISTAS ÚTILES
-- =============================================

-- Vista para dashboard de vendedor
CREATE OR REPLACE VIEW vista_dashboard_vendedor AS
SELECT 
    a.vendedor_codigo,
    au.nombre as vendedor_nombre,
    a.fecha_reporte,
    COUNT(*) as total_asignaciones,
    COUNT(CASE WHEN a.estado = 'ACTIVADO' THEN 1 END) as activados,
    COUNT(CASE WHEN a.estado = 'FALTA' THEN 1 END) as faltas,
    COUNT(CASE WHEN a.estado = '0' THEN 1 END) as ceros,
    ROUND(
        COUNT(CASE WHEN a.estado = 'ACTIVADO' THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as porcentaje_activacion
FROM asignaciones a
JOIN auth_users au ON a.vendedor_codigo = au.vendedor_codigo
GROUP BY a.vendedor_codigo, au.nombre, a.fecha_reporte;

-- Vista para resumen por cliente
CREATE OR REPLACE VIEW vista_resumen_cliente AS
SELECT 
    a.cliente_id,
    c.cliente_nombre,
    a.vendedor_codigo,
    a.fecha_reporte,
    COUNT(*) as total_categorias,
    COUNT(CASE WHEN a.estado = 'ACTIVADO' THEN 1 END) as categorias_activadas,
    COUNT(CASE WHEN a.estado = 'FALTA' THEN 1 END) as categorias_faltantes,
    STRING_AGG(
        CASE WHEN a.estado = 'FALTA' 
        THEN cat.categoria_nombre 
        END, ', '
    ) as categorias_pendientes
FROM asignaciones a
JOIN clientes c ON a.cliente_id = c.cliente_id
JOIN categorias cat ON a.categoria_id = cat.categoria_id
GROUP BY a.cliente_id, c.cliente_nombre, a.vendedor_codigo, a.fecha_reporte;

-- =============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE auth_users IS 'Usuarios del sistema con roles diferenciados';
COMMENT ON TABLE clientes IS 'Catálogo de clientes';
COMMENT ON TABLE categorias IS 'Catálogo de categorías de productos';
COMMENT ON TABLE asignaciones IS 'Tabla principal con asignaciones de categorías por cliente/vendedor';
COMMENT ON TABLE import_runs IS 'Registro de importaciones de Excel realizadas';

COMMENT ON COLUMN auth_users.vendedor_codigo IS 'Código único del vendedor (ej: E56)';
COMMENT ON COLUMN auth_users.rol IS 'Rol del usuario: admin, supervisor, vendedor';
COMMENT ON COLUMN auth_users.rutas IS 'Array de rutas asignadas al usuario';

COMMENT ON COLUMN asignaciones.estado IS 'Estado de la categoría: ACTIVADO, FALTA, 0';
COMMENT ON COLUMN asignaciones.zona IS 'Zona extraída de la ruta (ej: 1L -> 1)';

-- =============================================
-- FINALIZACIÓN
-- =============================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Esquema de base de datos creado exitosamente';
    RAISE NOTICE 'Tablas: auth_users, clientes, categorias, asignaciones, import_runs';
    RAISE NOTICE 'RLS habilitado con políticas de seguridad';
    RAISE NOTICE 'Datos semilla insertados';
END $$;
