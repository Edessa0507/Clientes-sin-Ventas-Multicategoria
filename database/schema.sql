-- Esquema de base de datos para Clientes sin Ventas Multicategoría
-- Ejecutar en Supabase SQL Editor

-- Habilitar RLS
ALTER DATABASE postgres SET row_security = on;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLAS PRINCIPALES
-- =============================================

-- Tabla de zonas
CREATE TABLE IF NOT EXISTS zonas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de rutas
CREATE TABLE IF NOT EXISTS rutas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    zona_id UUID REFERENCES zonas(id),
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(300) NOT NULL,
    zona_id UUID REFERENCES zonas(id),
    ruta_id UUID REFERENCES rutas(id),
    direccion TEXT,
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de supervisores
CREATE TABLE IF NOT EXISTS supervisores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(200) NOT NULL,
    zona_id UUID NOT NULL REFERENCES zonas(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de vendedores
CREATE TABLE IF NOT EXISTS vendedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(200) NOT NULL,
    zona_id UUID NOT NULL REFERENCES zonas(id),
    supervisor_id UUID REFERENCES supervisores(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS administradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(200) NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de asignaciones (relación cliente-categoría-vendedor)
CREATE TABLE IF NOT EXISTS asignaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    vendedor_id UUID NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES supervisores(id) ON DELETE CASCADE,
    estado VARCHAR(20) NOT NULL DEFAULT '0', -- 'Activado', 'FALTA', '0'
    fecha_asignacion DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, categoria_id, vendedor_id, fecha_asignacion)
);

-- Tabla de importaciones (log de cargas de Excel)
CREATE TABLE IF NOT EXISTS importaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES administradores(id),
    tipo VARCHAR(20) NOT NULL, -- 'reemplazo', 'incremental'
    archivo_nombre VARCHAR(500),
    registros_procesados INTEGER DEFAULT 0,
    registros_exitosos INTEGER DEFAULT 0,
    registros_errores INTEGER DEFAULT 0,
    fecha_inicio DATE,
    fecha_fin DATE,
    estado VARCHAR(20) DEFAULT 'procesando', -- 'procesando', 'completado', 'error'
    detalles_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON clientes(codigo);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);
CREATE INDEX IF NOT EXISTS idx_categorias_codigo ON categorias(codigo);
CREATE INDEX IF NOT EXISTS idx_categorias_activa ON categorias(activa);
CREATE INDEX IF NOT EXISTS idx_vendedores_codigo ON vendedores(codigo);
CREATE INDEX IF NOT EXISTS idx_vendedores_supervisor ON vendedores(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisores_codigo ON supervisores(codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_vendedor ON asignaciones(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_supervisor ON asignaciones(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha ON asignaciones(fecha_asignacion);
CREATE INDEX IF NOT EXISTS idx_asignaciones_estado ON asignaciones(estado);

-- =============================================
-- POLÍTICAS RLS (Row Level Security)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE importaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para vendedores
CREATE POLICY "Vendedores pueden ver sus propios datos" ON vendedores
    FOR SELECT USING (
        auth.uid() = user_id OR 
        codigo = current_setting('app.current_user_codigo', true)
    );

CREATE POLICY "Vendedores pueden ver sus asignaciones" ON asignaciones
    FOR SELECT USING (
        vendedor_id IN (
            SELECT id FROM vendedores 
            WHERE auth.uid() = user_id OR codigo = current_setting('app.current_user_codigo', true)
        )
    );

-- Políticas para supervisores
CREATE POLICY "Supervisores pueden ver sus propios datos" ON supervisores
    FOR SELECT USING (
        auth.uid() = user_id OR 
        codigo = current_setting('app.current_user_codigo', true)
    );

CREATE POLICY "Supervisores pueden ver sus vendedores" ON vendedores
    FOR SELECT USING (
        supervisor_id IN (
            SELECT id FROM supervisores 
            WHERE auth.uid() = user_id OR codigo = current_setting('app.current_user_codigo', true)
        )
    );

CREATE POLICY "Supervisores pueden ver asignaciones de sus vendedores" ON asignaciones
    FOR SELECT USING (
        supervisor_id IN (
            SELECT id FROM supervisores 
            WHERE auth.uid() = user_id OR codigo = current_setting('app.current_user_codigo', true)
        )
    );

-- Políticas para administradores
CREATE POLICY "Administradores pueden ver todo" ON zonas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administradores 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Administradores pueden ver todo" ON rutas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administradores 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Administradores pueden ver todo" ON clientes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administradores 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Administradores pueden ver todo" ON categorias
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administradores 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Administradores pueden ver todo" ON supervisores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administradores 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Administradores pueden ver todo" ON vendedores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administradores 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Administradores pueden ver todo" ON administradores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administradores 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Administradores pueden ver todo" ON asignaciones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administradores 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

CREATE POLICY "Administradores pueden ver todo" ON importaciones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administradores 
            WHERE user_id = auth.uid() AND activo = true
        )
    );

-- Políticas públicas para lectura de datos básicos (necesario para login)
CREATE POLICY "Lectura pública de vendedores para login" ON vendedores
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de supervisores para login" ON supervisores
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de categorías" ON categorias
    FOR SELECT USING (activa = true);

CREATE POLICY "Lectura pública de clientes" ON clientes
    FOR SELECT USING (activo = true);

-- =============================================
-- FUNCIONES Y TRIGGERS
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
CREATE TRIGGER update_zonas_updated_at BEFORE UPDATE ON zonas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rutas_updated_at BEFORE UPDATE ON rutas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supervisores_updated_at BEFORE UPDATE ON supervisores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendedores_updated_at BEFORE UPDATE ON vendedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_administradores_updated_at BEFORE UPDATE ON administradores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asignaciones_updated_at BEFORE UPDATE ON asignaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_importaciones_updated_at BEFORE UPDATE ON importaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para procesar importación de Excel
CREATE OR REPLACE FUNCTION import_excel_data(
    p_data JSONB,
    p_admin_id UUID,
    p_replace_mode BOOLEAN DEFAULT false,
    p_fecha_inicio DATE DEFAULT NULL,
    p_fecha_fin DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_importacion_id UUID;
    v_record JSONB;
    v_supervisor_id UUID;
    v_vendedor_id UUID;
    v_cliente_id UUID;
    v_categoria_id UUID;
    v_zona_id UUID;
    v_ruta_id UUID;
    v_registros_procesados INTEGER := 0;
    v_registros_exitosos INTEGER := 0;
    v_registros_errores INTEGER := 0;
    v_error_msg TEXT;
BEGIN
    -- Crear registro de importación
    INSERT INTO importaciones (admin_id, tipo, registros_procesados, fecha_inicio, fecha_fin, estado)
    VALUES (p_admin_id, CASE WHEN p_replace_mode THEN 'reemplazo' ELSE 'incremental' END, 
            jsonb_array_length(p_data), p_fecha_inicio, p_fecha_fin, 'procesando')
    RETURNING id INTO v_importacion_id;
    
    -- Si es modo reemplazo, eliminar datos del rango de fechas
    IF p_replace_mode AND p_fecha_inicio IS NOT NULL AND p_fecha_fin IS NOT NULL THEN
        DELETE FROM asignaciones 
        WHERE fecha_asignacion >= p_fecha_inicio AND fecha_asignacion <= p_fecha_fin;
    END IF;
    
    -- Procesar cada registro
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
    LOOP
        BEGIN
            v_registros_procesados := v_registros_procesados + 1;
            
            -- Obtener o crear zona
            INSERT INTO zonas (codigo, nombre) 
            VALUES (v_record->>'zona_codigo', v_record->>'zona_nombre')
            ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
            RETURNING id INTO v_zona_id;
            
            -- Obtener o crear ruta
            INSERT INTO rutas (codigo, nombre, zona_id) 
            VALUES (v_record->>'ruta_codigo', v_record->>'ruta_nombre', v_zona_id)
            ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, zona_id = EXCLUDED.zona_id
            RETURNING id INTO v_ruta_id;
            
            -- Obtener o crear supervisor
            INSERT INTO supervisores (codigo, nombre_completo, zona_id) 
            VALUES (v_record->>'supervisor_codigo', v_record->>'supervisor_nombre', v_zona_id)
            ON CONFLICT (codigo) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo, zona_id = EXCLUDED.zona_id
            RETURNING id INTO v_supervisor_id;
            
            -- Obtener o crear vendedor
            INSERT INTO vendedores (codigo, nombre_completo, zona_id, supervisor_id) 
            VALUES (v_record->>'vendedor_codigo', v_record->>'vendedor_nombre', v_zona_id, v_supervisor_id)
            ON CONFLICT (codigo) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo, zona_id = EXCLUDED.zona_id, supervisor_id = EXCLUDED.supervisor_id
            RETURNING id INTO v_vendedor_id;
            
            -- Obtener o crear cliente
            INSERT INTO clientes (codigo, nombre, zona_id, ruta_id) 
            VALUES (v_record->>'cliente_codigo', v_record->>'cliente_nombre', v_zona_id, v_ruta_id)
            ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, zona_id = EXCLUDED.zona_id, ruta_id = EXCLUDED.ruta_id
            RETURNING id INTO v_cliente_id;
            
            -- Obtener o crear categoría
            INSERT INTO categorias (codigo, nombre) 
            VALUES (v_record->>'categoria_codigo', v_record->>'categoria_nombre')
            ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
            RETURNING id INTO v_categoria_id;
            
            -- Insertar o actualizar asignación
            INSERT INTO asignaciones (cliente_id, categoria_id, vendedor_id, supervisor_id, estado, fecha_asignacion)
            VALUES (v_cliente_id, v_categoria_id, v_vendedor_id, v_supervisor_id, 
                    v_record->>'estado', COALESCE((v_record->>'fecha')::DATE, CURRENT_DATE))
            ON CONFLICT (cliente_id, categoria_id, vendedor_id, fecha_asignacion) 
            DO UPDATE SET estado = EXCLUDED.estado, supervisor_id = EXCLUDED.supervisor_id, updated_at = NOW();
            
            v_registros_exitosos := v_registros_exitosos + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_registros_errores := v_registros_errores + 1;
            v_error_msg := SQLERRM;
        END;
    END LOOP;
    
    -- Actualizar registro de importación
    UPDATE importaciones 
    SET registros_exitosos = v_registros_exitosos,
        registros_errores = v_registros_errores,
        estado = CASE WHEN v_registros_errores = 0 THEN 'completado' ELSE 'error' END,
        detalles_error = v_error_msg,
        updated_at = NOW()
    WHERE id = v_importacion_id;
    
    RETURN jsonb_build_object(
        'importacion_id', v_importacion_id,
        'registros_procesados', v_registros_procesados,
        'registros_exitosos', v_registros_exitosos,
        'registros_errores', v_registros_errores,
        'estado', CASE WHEN v_registros_errores = 0 THEN 'completado' ELSE 'error' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
