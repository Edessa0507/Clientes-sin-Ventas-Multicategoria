-- =====================================================
-- ESQUEMA INICIAL - PWA GENERADOR DE CLIENTES SIN VENTAS
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- TABLAS PRINCIPALES
-- =====================================================

-- Tabla de zonas geográficas
CREATE TABLE zonas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de rutas de venta
CREATE TABLE rutas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zona_id UUID NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(zona_id, codigo)
);

-- Tabla de categorías de productos
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de usuarios del sistema (mapeo con Supabase Auth)
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_user_id UUID UNIQUE, -- Referencia a auth.users de Supabase
    codigo VARCHAR(20) UNIQUE, -- Para vendedores y supervisores
    email VARCHAR(255) UNIQUE, -- Para administradores
    nombre_completo VARCHAR(200) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'supervisor', 'vendedor')),
    zona_id UUID REFERENCES zonas(id),
    supervisor_id UUID REFERENCES auth_users(id),
    activo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMPTZ,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_codigo_required CHECK (
        (rol IN ('vendedor', 'supervisor') AND codigo IS NOT NULL) OR
        (rol = 'admin' AND email IS NOT NULL)
    )
);

-- Tabla de vendedores (vista extendida de auth_users)
CREATE TABLE vendedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(200) NOT NULL,
    zona_id UUID NOT NULL REFERENCES zonas(id),
    supervisor_id UUID REFERENCES auth_users(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    zona_id UUID NOT NULL REFERENCES zonas(id),
    ruta_id UUID NOT NULL REFERENCES rutas(id),
    direccion TEXT,
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de asignaciones vendedor-cliente-categoría
CREATE TABLE asignaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_reporte DATE NOT NULL,
    vendedor_id UUID NOT NULL REFERENCES vendedores(id),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    categoria_id UUID NOT NULL REFERENCES categorias(id),
    estado_activacion VARCHAR(20) DEFAULT 'pendiente' CHECK (estado_activacion IN ('pendiente', 'activado', 'no_aplica')),
    meta_activacion BOOLEAN DEFAULT false,
    ventas_recientes DECIMAL(10,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fecha_reporte, vendedor_id, cliente_id, categoria_id)
);

-- Tabla de auditoría de importaciones
CREATE TABLE import_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES auth_users(id),
    nombre_archivo VARCHAR(255) NOT NULL,
    nombre_hoja VARCHAR(100),
    hash_archivo VARCHAR(64),
    total_filas INTEGER NOT NULL,
    filas_procesadas INTEGER DEFAULT 0,
    filas_insertadas INTEGER DEFAULT 0,
    filas_actualizadas INTEGER DEFAULT 0,
    filas_eliminadas INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'iniciado' CHECK (estado IN ('iniciado', 'procesando', 'completado', 'error')),
    mensaje_error TEXT,
    resumen_cambios JSONB,
    fecha_datos DATE, -- Fecha de los datos importados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Tabla temporal para staging de importaciones
CREATE TABLE import_staging (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
    fila_numero INTEGER NOT NULL,
    datos_originales JSONB NOT NULL,
    datos_procesados JSONB,
    errores TEXT[],
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesado', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para búsquedas frecuentes
CREATE INDEX idx_auth_users_codigo ON auth_users(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX idx_auth_users_rol ON auth_users(rol);
CREATE INDEX idx_auth_users_zona ON auth_users(zona_id);

CREATE INDEX idx_vendedores_codigo ON vendedores(codigo);
CREATE INDEX idx_vendedores_zona ON vendedores(zona_id);
CREATE INDEX idx_vendedores_supervisor ON vendedores(supervisor_id);

CREATE INDEX idx_clientes_codigo ON clientes(codigo);
CREATE INDEX idx_clientes_nombre_trgm ON clientes USING gin(nombre gin_trgm_ops);
CREATE INDEX idx_clientes_zona_ruta ON clientes(zona_id, ruta_id);

CREATE INDEX idx_asignaciones_fecha_vendedor ON asignaciones(fecha_reporte, vendedor_id);
CREATE INDEX idx_asignaciones_cliente_categoria ON asignaciones(cliente_id, categoria_id);
CREATE INDEX idx_asignaciones_estado ON asignaciones(estado_activacion);

CREATE INDEX idx_import_runs_usuario_fecha ON import_runs(usuario_id, created_at DESC);
CREATE INDEX idx_import_staging_run ON import_staging(import_run_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_zonas_updated_at BEFORE UPDATE ON zonas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rutas_updated_at BEFORE UPDATE ON rutas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auth_users_updated_at BEFORE UPDATE ON auth_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendedores_updated_at BEFORE UPDATE ON vendedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asignaciones_updated_at BEFORE UPDATE ON asignaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para extraer código y nombre del vendedor desde VendedorDisplay
CREATE OR REPLACE FUNCTION parse_vendedor_display(vendedor_display TEXT)
RETURNS TABLE(codigo TEXT, nombre TEXT) AS $$
BEGIN
    -- Regex para extraer código y nombre: "E56  - (PREV) PEDRO JOSE BURGOS"
    RETURN QUERY
    SELECT 
        TRIM(split_part(vendedor_display, '-', 1)) as codigo,
        TRIM(split_part(vendedor_display, '-', 2)) as nombre;
END;
$$ LANGUAGE plpgsql;

-- Función para normalizar strings
CREATE OR REPLACE FUNCTION normalize_string(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Trim, eliminar dobles espacios, convertir a mayúsculas
    RETURN UPPER(TRIM(REGEXP_REPLACE(input_text, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTAS MATERIALIZADAS PARA PERFORMANCE
-- =====================================================

-- Vista de progreso por vendedor y cliente
CREATE MATERIALIZED VIEW vista_progreso_vendedor AS
SELECT 
    v.id as vendedor_id,
    v.codigo as vendedor_codigo,
    v.nombre_completo as vendedor_nombre,
    c.id as cliente_id,
    c.codigo as cliente_codigo,
    c.nombre as cliente_nombre,
    z.nombre as zona_nombre,
    r.nombre as ruta_nombre,
    COUNT(a.id) as total_categorias,
    COUNT(CASE WHEN a.estado_activacion = 'activado' THEN 1 END) as categorias_activadas,
    COUNT(CASE WHEN a.estado_activacion = 'pendiente' THEN 1 END) as categorias_pendientes,
    ROUND(
        (COUNT(CASE WHEN a.estado_activacion = 'activado' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(a.id), 0)) * 100, 2
    ) as porcentaje_activacion,
    MAX(a.fecha_reporte) as ultima_actualizacion
FROM vendedores v
JOIN asignaciones a ON v.id = a.vendedor_id
JOIN clientes c ON a.cliente_id = c.id
JOIN zonas z ON c.zona_id = z.id
JOIN rutas r ON c.ruta_id = r.id
WHERE v.activo = true AND c.activo = true
GROUP BY v.id, v.codigo, v.nombre_completo, c.id, c.codigo, c.nombre, z.nombre, r.nombre;

-- Índice para la vista materializada
CREATE UNIQUE INDEX idx_vista_progreso_vendedor_unique ON vista_progreso_vendedor(vendedor_id, cliente_id);
CREATE INDEX idx_vista_progreso_vendedor_codigo ON vista_progreso_vendedor(vendedor_codigo);

-- Vista de KPIs por zona
CREATE MATERIALIZED VIEW vista_kpis_zona AS
SELECT 
    z.id as zona_id,
    z.codigo as zona_codigo,
    z.nombre as zona_nombre,
    COUNT(DISTINCT v.id) as total_vendedores,
    COUNT(DISTINCT c.id) as total_clientes,
    COUNT(DISTINCT a.categoria_id) as total_categorias,
    COUNT(CASE WHEN a.estado_activacion = 'activado' THEN 1 END) as total_activadas,
    COUNT(CASE WHEN a.estado_activacion = 'pendiente' THEN 1 END) as total_pendientes,
    ROUND(
        (COUNT(CASE WHEN a.estado_activacion = 'activado' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(a.id), 0)) * 100, 2
    ) as porcentaje_activacion_zona,
    MAX(a.fecha_reporte) as ultima_actualizacion
FROM zonas z
LEFT JOIN vendedores v ON z.id = v.zona_id AND v.activo = true
LEFT JOIN asignaciones a ON v.id = a.vendedor_id
LEFT JOIN clientes c ON a.cliente_id = c.id AND c.activo = true
WHERE z.activa = true
GROUP BY z.id, z.codigo, z.nombre;

-- Índice para KPIs por zona
CREATE UNIQUE INDEX idx_vista_kpis_zona_unique ON vista_kpis_zona(zona_id);

-- =====================================================
-- FUNCIONES PARA REFRESCAR VISTAS MATERIALIZADAS
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY vista_progreso_vendedor;
    REFRESH MATERIALIZED VIEW CONCURRENTLY vista_kpis_zona;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas sensibles
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging ENABLE ROW LEVEL SECURITY;

-- Políticas para auth_users
CREATE POLICY "Usuarios pueden ver su propio perfil" ON auth_users
    FOR SELECT USING (auth.uid() = supabase_user_id);

CREATE POLICY "Admins pueden ver todos los usuarios" ON auth_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users au 
            WHERE au.supabase_user_id = auth.uid() 
            AND au.rol = 'admin' 
            AND au.activo = true
        )
    );

CREATE POLICY "Supervisores pueden ver vendedores de su zona" ON auth_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_users supervisor 
            WHERE supervisor.supabase_user_id = auth.uid() 
            AND supervisor.rol = 'supervisor' 
            AND supervisor.activo = true
            AND (
                supervisor.zona_id = auth_users.zona_id OR
                supervisor.id = auth_users.supervisor_id
            )
        )
    );

-- Políticas para vendedores
CREATE POLICY "Vendedores pueden ver su propio registro" ON vendedores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_users au 
            WHERE au.supabase_user_id = auth.uid() 
            AND au.id = vendedores.user_id
        )
    );

CREATE POLICY "Supervisores pueden ver vendedores asignados" ON vendedores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_users supervisor 
            WHERE supervisor.supabase_user_id = auth.uid() 
            AND supervisor.rol = 'supervisor' 
            AND supervisor.activo = true
            AND (
                supervisor.zona_id = vendedores.zona_id OR
                supervisor.id = vendedores.supervisor_id
            )
        )
    );

CREATE POLICY "Admins pueden gestionar vendedores" ON vendedores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users au 
            WHERE au.supabase_user_id = auth.uid() 
            AND au.rol = 'admin' 
            AND au.activo = true
        )
    );

-- Políticas para clientes
CREATE POLICY "Vendedores pueden ver sus clientes asignados" ON clientes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vendedores v
            JOIN auth_users au ON v.user_id = au.id
            WHERE au.supabase_user_id = auth.uid()
            AND v.zona_id = clientes.zona_id
            AND au.activo = true
            AND v.activo = true
        )
    );

CREATE POLICY "Supervisores pueden ver clientes de su zona" ON clientes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_users supervisor 
            WHERE supervisor.supabase_user_id = auth.uid() 
            AND supervisor.rol = 'supervisor' 
            AND supervisor.zona_id = clientes.zona_id
            AND supervisor.activo = true
        )
    );

CREATE POLICY "Admins pueden gestionar clientes" ON clientes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users au 
            WHERE au.supabase_user_id = auth.uid() 
            AND au.rol = 'admin' 
            AND au.activo = true
        )
    );

-- Políticas para asignaciones
CREATE POLICY "Vendedores pueden ver sus asignaciones" ON asignaciones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vendedores v
            JOIN auth_users au ON v.user_id = au.id
            WHERE au.supabase_user_id = auth.uid()
            AND v.id = asignaciones.vendedor_id
            AND au.activo = true
            AND v.activo = true
        )
    );

CREATE POLICY "Supervisores pueden ver asignaciones de su zona" ON asignaciones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vendedores v
            JOIN auth_users supervisor ON supervisor.zona_id = v.zona_id
            WHERE supervisor.supabase_user_id = auth.uid()
            AND supervisor.rol = 'supervisor'
            AND v.id = asignaciones.vendedor_id
            AND supervisor.activo = true
            AND v.activo = true
        )
    );

CREATE POLICY "Admins pueden gestionar asignaciones" ON asignaciones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users au 
            WHERE au.supabase_user_id = auth.uid() 
            AND au.rol = 'admin' 
            AND au.activo = true
        )
    );

-- Políticas para import_runs (solo admins)
CREATE POLICY "Solo admins pueden gestionar importaciones" ON import_runs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users au 
            WHERE au.supabase_user_id = auth.uid() 
            AND au.rol = 'admin' 
            AND au.activo = true
        )
    );

CREATE POLICY "Solo admins pueden gestionar staging" ON import_staging
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_users au 
            WHERE au.supabase_user_id = auth.uid() 
            AND au.rol = 'admin' 
            AND au.activo = true
        )
    );

-- =====================================================
-- COMENTARIOS EN TABLAS
-- =====================================================

COMMENT ON TABLE zonas IS 'Zonas geográficas de venta';
COMMENT ON TABLE rutas IS 'Rutas de venta dentro de cada zona';
COMMENT ON TABLE categorias IS 'Categorías de productos a activar';
COMMENT ON TABLE auth_users IS 'Usuarios del sistema con mapeo a Supabase Auth';
COMMENT ON TABLE vendedores IS 'Información extendida de vendedores';
COMMENT ON TABLE clientes IS 'Clientes del sistema';
COMMENT ON TABLE asignaciones IS 'Asignaciones de vendedor-cliente-categoría con estados';
COMMENT ON TABLE import_runs IS 'Auditoría de importaciones de Excel';
COMMENT ON TABLE import_staging IS 'Tabla temporal para validar datos antes de importar';

COMMENT ON MATERIALIZED VIEW vista_progreso_vendedor IS 'Vista optimizada del progreso de activación por vendedor y cliente';
COMMENT ON MATERIALIZED VIEW vista_kpis_zona IS 'KPIs agregados por zona geográfica';
