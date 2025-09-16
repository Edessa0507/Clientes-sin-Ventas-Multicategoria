-- Script para corregir problema de búsqueda de supervisor
-- Ejecutar después de validar los datos

-- 1. Crear función para búsqueda flexible de supervisor
CREATE OR REPLACE FUNCTION buscar_supervisor_flexible(codigo_busqueda TEXT)
RETURNS TABLE (
    supervisor_codigo TEXT,
    supervisor_nombre TEXT,
    total_vendedores BIGINT,
    total_asignaciones BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        a.supervisor_codigo::TEXT,
        a.supervisor_nombre::TEXT,
        COUNT(DISTINCT a.vendedor_codigo) as total_vendedores,
        COUNT(*) as total_asignaciones
    FROM asignaciones a
    WHERE 
        a.supervisor_codigo ILIKE '%' || codigo_busqueda || '%'
        OR a.supervisor_nombre ILIKE '%' || codigo_busqueda || '%'
        OR UPPER(a.supervisor_codigo) = UPPER(codigo_busqueda)
        OR UPPER(a.supervisor_nombre) LIKE '%' || UPPER(codigo_busqueda) || '%'
    GROUP BY a.supervisor_codigo, a.supervisor_nombre;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear función para obtener vendedores por supervisor
CREATE OR REPLACE FUNCTION obtener_vendedores_supervisor(codigo_busqueda TEXT)
RETURNS TABLE (
    vendedor_codigo TEXT,
    vendedor_nombre TEXT,
    supervisor_codigo TEXT,
    supervisor_nombre TEXT,
    total_clientes BIGINT,
    total_asignaciones BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        a.vendedor_codigo::TEXT,
        a.vendedor_nombre::TEXT,
        a.supervisor_codigo::TEXT,
        a.supervisor_nombre::TEXT,
        COUNT(DISTINCT a.cliente_codigo) as total_clientes,
        COUNT(*) as total_asignaciones
    FROM asignaciones a
    WHERE 
        a.supervisor_codigo ILIKE '%' || codigo_busqueda || '%'
        OR a.supervisor_nombre ILIKE '%' || codigo_busqueda || '%'
        OR UPPER(a.supervisor_codigo) = UPPER(codigo_busqueda)
        OR UPPER(a.supervisor_nombre) LIKE '%' || UPPER(codigo_busqueda) || '%'
    GROUP BY a.vendedor_codigo, a.vendedor_nombre, a.supervisor_codigo, a.supervisor_nombre
    ORDER BY a.vendedor_codigo;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear función para sincronizar rutas desde asignaciones
CREATE OR REPLACE FUNCTION sync_rutas_from_asignaciones()
RETURNS TABLE (
    rutas_insertadas INTEGER,
    rutas_actualizadas INTEGER
) AS $$
DECLARE
    insertadas INTEGER := 0;
    actualizadas INTEGER := 0;
BEGIN
    -- Insertar rutas nuevas desde asignaciones
    INSERT INTO rutas (codigo, nombre, activa, created_at, updated_at)
    SELECT DISTINCT 
        a.ruta_codigo,
        a.ruta_nombre,
        true,
        NOW(),
        NOW()
    FROM asignaciones a
    WHERE a.ruta_codigo IS NOT NULL 
      AND a.ruta_nombre IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM rutas r 
          WHERE r.codigo = a.ruta_codigo
      );
    
    GET DIAGNOSTICS insertadas = ROW_COUNT;
    
    -- Actualizar nombres de rutas existentes si han cambiado
    UPDATE rutas 
    SET 
        nombre = a.ruta_nombre,
        updated_at = NOW()
    FROM (
        SELECT DISTINCT ruta_codigo, ruta_nombre 
        FROM asignaciones 
        WHERE ruta_codigo IS NOT NULL AND ruta_nombre IS NOT NULL
    ) a
    WHERE rutas.codigo = a.ruta_codigo 
      AND rutas.nombre != a.ruta_nombre;
    
    GET DIAGNOSTICS actualizadas = ROW_COUNT;
    
    RETURN QUERY SELECT insertadas, actualizadas;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear índices para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_asignaciones_supervisor_codigo_upper 
ON asignaciones (UPPER(supervisor_codigo));

CREATE INDEX IF NOT EXISTS idx_asignaciones_supervisor_nombre_upper 
ON asignaciones (UPPER(supervisor_nombre));

CREATE INDEX IF NOT EXISTS idx_asignaciones_vendedor_supervisor 
ON asignaciones (vendedor_codigo, supervisor_codigo);

-- 5. Pruebas de las funciones
SELECT 'Búsqueda CVALDEZ:' as test;
SELECT * FROM buscar_supervisor_flexible('CVALDEZ');

SELECT 'Vendedores de CVALDEZ:' as test;
SELECT * FROM obtener_vendedores_supervisor('CVALDEZ');

SELECT 'Sincronización de rutas:' as test;
SELECT * FROM sync_rutas_from_asignaciones();
