-- Crear tabla de staging para importaciones Excel
CREATE TABLE IF NOT EXISTS asignaciones_staging (
    id BIGSERIAL PRIMARY KEY,
    supervisor_codigo VARCHAR(50),
    supervisor_nombre VARCHAR(255),
    vendedor_codigo VARCHAR(50),
    vendedor_nombre VARCHAR(255),
    ruta_codigo VARCHAR(50),
    ruta_nombre VARCHAR(255),
    cliente_codigo VARCHAR(50),
    cliente_nombre VARCHAR(255),
    categoria_codigo VARCHAR(50),
    categoria_nombre VARCHAR(100),
    estado VARCHAR(20),
    fecha DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_asignaciones_staging_supervisor ON asignaciones_staging(supervisor_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_staging_vendedor ON asignaciones_staging(vendedor_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_staging_cliente ON asignaciones_staging(cliente_codigo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_staging_fecha ON asignaciones_staging(fecha);

-- Actualizar tabla importaciones para incluir nuevos campos
ALTER TABLE importaciones 
ADD COLUMN IF NOT EXISTS archivo_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS total_registros INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS registros_exitosos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS registros_errores INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS modo_importacion VARCHAR(20) DEFAULT 'incremental',
ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
ADD COLUMN IF NOT EXISTS fecha_fin DATE,
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';

-- Función para promover datos de staging a producción
CREATE OR REPLACE FUNCTION promote_staging_to_production()
RETURNS TABLE(
    total_promoted INTEGER,
    rutas_created INTEGER,
    message TEXT
) AS $$
DECLARE
    promoted_count INTEGER := 0;
    rutas_count INTEGER := 0;
BEGIN
    -- Insertar datos únicos de staging a producción
    INSERT INTO asignaciones (
        supervisor_codigo,
        supervisor_nombre,
        vendedor_codigo,
        vendedor_nombre,
        ruta_codigo,
        ruta_nombre,
        cliente_codigo,
        cliente_nombre,
        categoria_codigo,
        categoria_nombre,
        estado,
        fecha,
        created_at,
        updated_at
    )
    SELECT DISTINCT
        s.supervisor_codigo,
        s.supervisor_nombre,
        s.vendedor_codigo,
        s.vendedor_nombre,
        s.ruta_codigo,
        s.ruta_nombre,
        s.cliente_codigo,
        s.cliente_nombre,
        s.categoria_codigo,
        s.categoria_nombre,
        s.estado,
        s.fecha,
        s.created_at,
        NOW()
    FROM asignaciones_staging s
    WHERE NOT EXISTS (
        SELECT 1 FROM asignaciones a
        WHERE a.supervisor_codigo = s.supervisor_codigo
        AND a.vendedor_codigo = s.vendedor_codigo
        AND a.cliente_codigo = s.cliente_codigo
        AND a.categoria_codigo = s.categoria_codigo
        AND a.fecha = s.fecha
    );
    
    GET DIAGNOSTICS promoted_count = ROW_COUNT;
    
    -- Sincronizar rutas desde asignaciones
    INSERT INTO rutas (ruta_codigo, ruta_nombre, created_at, updated_at)
    SELECT DISTINCT 
        s.ruta_codigo,
        s.ruta_nombre,
        NOW(),
        NOW()
    FROM asignaciones_staging s
    WHERE s.ruta_codigo IS NOT NULL 
    AND s.ruta_codigo != ''
    AND NOT EXISTS (
        SELECT 1 FROM rutas r 
        WHERE r.ruta_codigo = s.ruta_codigo
    );
    
    GET DIAGNOSTICS rutas_count = ROW_COUNT;
    
    -- Limpiar tabla staging
    DELETE FROM asignaciones_staging;
    
    RETURN QUERY SELECT 
        promoted_count,
        rutas_count,
        format('Promoción completada: %s registros movidos a producción, %s rutas creadas', 
               promoted_count, rutas_count);
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS en tabla staging
ALTER TABLE asignaciones_staging ENABLE ROW LEVEL SECURITY;

-- Política para admin en staging
CREATE POLICY "Admin can manage staging data" ON asignaciones_staging
    FOR ALL USING (true);

COMMENT ON TABLE asignaciones_staging IS 'Tabla temporal para procesar importaciones Excel antes de mover a producción';
COMMENT ON FUNCTION promote_staging_to_production() IS 'Mueve datos validados de staging a producción y sincroniza rutas';
