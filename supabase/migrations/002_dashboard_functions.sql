-- =====================================================
-- FUNCIONES RPC PARA DASHBOARDS
-- =====================================================

-- Función para obtener datos del dashboard de vendedor
CREATE OR REPLACE FUNCTION get_vendedor_dashboard_data(p_vendedor_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    vendedor_data RECORD;
    rutas_data JSON;
    clientes_data JSON;
BEGIN
    -- Obtener información del vendedor
    SELECT 
        au.id,
        au.codigo,
        au.nombre_completo,
        au.zona_id,
        z.nombre as zona_nombre
    INTO vendedor_data
    FROM auth_users au
    LEFT JOIN zonas z ON au.zona_id = z.id
    WHERE au.id = p_vendedor_id AND au.rol = 'vendedor' AND au.activo = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Vendedor no encontrado');
    END IF;
    
    -- Obtener rutas del vendedor con conteo de clientes
    SELECT json_agg(
        json_build_object(
            'id', r.id,
            'nombre', r.nombre,
            'clientesCount', COALESCE(clientes_count.count, 0)
        )
    ) INTO rutas_data
    FROM rutas r
    LEFT JOIN (
        SELECT 
            c.ruta_id,
            COUNT(*) as count
        FROM clientes c
        WHERE c.zona_id = vendedor_data.zona_id AND c.activo = true
        GROUP BY c.ruta_id
    ) clientes_count ON r.id = clientes_count.ruta_id
    WHERE r.zona_id = vendedor_data.zona_id AND r.activa = true;
    
    -- Obtener clientes con sus categorías
    SELECT json_agg(
        json_build_object(
            'id', c.codigo,
            'nombre', c.nombre,
            'ruta', r.nombre,
            'categorias', json_build_object(
                'ensure', CASE WHEN COALESCE(ensure_status.estado, 'Falta') = 'activado' THEN 'Activado' ELSE 'Falta' END,
                'chocolate', CASE WHEN COALESCE(chocolate_status.estado, 'Falta') = 'activado' THEN 'Activado' ELSE 'Falta' END,
                'alpina', CASE WHEN COALESCE(alpina_status.estado, 'Falta') = 'activado' THEN 'Activado' ELSE 'Falta' END,
                'superAlim', CASE WHEN COALESCE(superalim_status.estado, 'Falta') = 'activado' THEN 'Activado' ELSE 'Falta' END
            )
        )
    ) INTO clientes_data
    FROM clientes c
    JOIN rutas r ON c.ruta_id = r.id
    LEFT JOIN (
        SELECT 
            a.cliente_id,
            a.estado_activacion as estado
        FROM asignaciones a
        JOIN categorias cat ON a.categoria_id = cat.id
        WHERE cat.codigo = 'CAT001' -- ENSURE
        AND a.fecha_reporte = CURRENT_DATE
    ) ensure_status ON c.id = ensure_status.cliente_id
    LEFT JOIN (
        SELECT 
            a.cliente_id,
            a.estado_activacion as estado
        FROM asignaciones a
        JOIN categorias cat ON a.categoria_id = cat.id
        WHERE cat.codigo = 'CAT002' -- CHOCOLATE
        AND a.fecha_reporte = CURRENT_DATE
    ) chocolate_status ON c.id = chocolate_status.cliente_id
    LEFT JOIN (
        SELECT 
            a.cliente_id,
            a.estado_activacion as estado
        FROM asignaciones a
        JOIN categorias cat ON a.categoria_id = cat.id
        WHERE cat.codigo = 'CAT003' -- ALPINA
        AND a.fecha_reporte = CURRENT_DATE
    ) alpina_status ON c.id = alpina_status.cliente_id
    LEFT JOIN (
        SELECT 
            a.cliente_id,
            a.estado_activacion as estado
        FROM asignaciones a
        JOIN categorias cat ON a.categoria_id = cat.id
        WHERE cat.codigo = 'CAT004' -- SUPER DE ALIM
        AND a.fecha_reporte = CURRENT_DATE
    ) superalim_status ON c.id = superalim_status.cliente_id
    WHERE c.zona_id = vendedor_data.zona_id AND c.activo = true;
    
    -- Construir respuesta
    result := json_build_object(
        'vendedor', json_build_object(
            'id', vendedor_data.id,
            'codigo', vendedor_data.codigo,
            'nombre', vendedor_data.nombre_completo,
            'zona', vendedor_data.zona_nombre
        ),
        'rutas', COALESCE(rutas_data, '[]'::json),
        'clientes', COALESCE(clientes_data, '[]'::json)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener datos del dashboard de supervisor
CREATE OR REPLACE FUNCTION get_supervisor_dashboard_data(p_supervisor_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    supervisor_data RECORD;
    vendedores_data JSON;
    kpis_data JSON;
BEGIN
    -- Obtener información del supervisor
    SELECT 
        au.id,
        au.codigo,
        au.nombre_completo,
        au.zona_id,
        z.nombre as zona_nombre
    INTO supervisor_data
    FROM auth_users au
    LEFT JOIN zonas z ON au.zona_id = z.id
    WHERE au.id = p_supervisor_id AND au.rol = 'supervisor' AND au.activo = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Supervisor no encontrado');
    END IF;
    
    -- Obtener vendedores del supervisor
    SELECT json_agg(
        json_build_object(
            'id', v.id,
            'codigo', v.codigo,
            'nombre', v.nombre_completo,
            'progreso', COALESCE(progreso.porcentaje, 0)
        )
    ) INTO vendedores_data
    FROM vendedores v
    LEFT JOIN (
        SELECT 
            a.vendedor_id,
            ROUND(
                (COUNT(CASE WHEN a.estado_activacion = 'activado' THEN 1 END)::DECIMAL / 
                 NULLIF(COUNT(a.id), 0)) * 100, 2
            ) as porcentaje
        FROM asignaciones a
        WHERE a.fecha_reporte = CURRENT_DATE
        GROUP BY a.vendedor_id
    ) progreso ON v.id = progreso.vendedor_id
    WHERE v.zona_id = supervisor_data.zona_id AND v.activo = true;
    
    -- Obtener KPIs de la zona
    SELECT json_build_object(
        'total_vendedores', COALESCE(kpis.total_vendedores, 0),
        'total_clientes', COALESCE(kpis.total_clientes, 0),
        'progreso_zona', COALESCE(kpis.progreso_zona, 0),
        'clientes_activos', COALESCE(kpis.clientes_activos, 0)
    ) INTO kpis_data
    FROM (
        SELECT 
            COUNT(DISTINCT v.id) as total_vendedores,
            COUNT(DISTINCT c.id) as total_clientes,
            ROUND(
                (COUNT(CASE WHEN a.estado_activacion = 'activado' THEN 1 END)::DECIMAL / 
                 NULLIF(COUNT(a.id), 0)) * 100, 2
            ) as progreso_zona,
            COUNT(DISTINCT CASE WHEN a.estado_activacion = 'activado' THEN c.id END) as clientes_activos
        FROM vendedores v
        LEFT JOIN clientes c ON c.zona_id = v.zona_id AND c.activo = true
        LEFT JOIN asignaciones a ON a.vendedor_id = v.id AND a.fecha_reporte = CURRENT_DATE
        WHERE v.zona_id = supervisor_data.zona_id AND v.activo = true
    ) kpis;
    
    -- Construir respuesta
    result := json_build_object(
        'supervisor', json_build_object(
            'id', supervisor_data.id,
            'codigo', supervisor_data.codigo,
            'nombre', supervisor_data.nombre_completo,
            'zona', supervisor_data.zona_nombre
        ),
        'vendedores', COALESCE(vendedores_data, '[]'::json),
        'kpis', COALESCE(kpis_data, '{}'::json)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener datos del dashboard de administrador
CREATE OR REPLACE FUNCTION get_admin_dashboard_data()
RETURNS JSON AS $$
DECLARE
    result JSON;
    global_kpis JSON;
    zonas_data JSON;
    import_history JSON;
BEGIN
    -- Obtener KPIs globales
    SELECT json_build_object(
        'total_zonas', COALESCE(kpis.total_zonas, 0),
        'total_vendedores', COALESCE(kpis.total_vendedores, 0),
        'total_supervisores', COALESCE(kpis.total_supervisores, 0),
        'total_clientes', COALESCE(kpis.total_clientes, 0),
        'progreso_global', COALESCE(kpis.progreso_global, 0),
        'ultima_importacion', kpis.ultima_importacion
    ) INTO global_kpis
    FROM (
        SELECT 
            COUNT(DISTINCT z.id) as total_zonas,
            COUNT(DISTINCT v.id) as total_vendedores,
            COUNT(DISTINCT s.id) as total_supervisores,
            COUNT(DISTINCT c.id) as total_clientes,
            ROUND(
                (COUNT(CASE WHEN a.estado_activacion = 'activado' THEN 1 END)::DECIMAL / 
                 NULLIF(COUNT(a.id), 0)) * 100, 2
            ) as progreso_global,
            MAX(ir.created_at) as ultima_importacion
        FROM zonas z
        LEFT JOIN vendedores v ON v.zona_id = z.id AND v.activo = true
        LEFT JOIN auth_users s ON s.zona_id = z.id AND s.rol = 'supervisor' AND s.activo = true
        LEFT JOIN clientes c ON c.zona_id = z.id AND c.activo = true
        LEFT JOIN asignaciones a ON a.vendedor_id = v.id AND a.fecha_reporte = CURRENT_DATE
        WHERE z.activa = true
    ) kpis;
    
    -- Obtener datos por zona
    SELECT json_agg(
        json_build_object(
            'id', z.id,
            'nombre', z.nombre,
            'vendedores', COALESCE(zona_stats.vendedores, 0),
            'clientes', COALESCE(zona_stats.clientes, 0),
            'progreso', COALESCE(zona_stats.progreso, 0)
        )
    ) INTO zonas_data
    FROM zonas z
    LEFT JOIN (
        SELECT 
            z.id as zona_id,
            COUNT(DISTINCT v.id) as vendedores,
            COUNT(DISTINCT c.id) as clientes,
            ROUND(
                (COUNT(CASE WHEN a.estado_activacion = 'activado' THEN 1 END)::DECIMAL / 
                 NULLIF(COUNT(a.id), 0)) * 100, 2
            ) as progreso
        FROM zonas z
        LEFT JOIN vendedores v ON v.zona_id = z.id AND v.activo = true
        LEFT JOIN clientes c ON c.zona_id = z.id AND c.activo = true
        LEFT JOIN asignaciones a ON a.vendedor_id = v.id AND a.fecha_reporte = CURRENT_DATE
        WHERE z.activa = true
        GROUP BY z.id
    ) zona_stats ON z.id = zona_stats.zona_id
    WHERE z.activa = true;
    
    -- Obtener historial de importaciones
    SELECT json_agg(
        json_build_object(
            'id', ir.id,
            'fecha', ir.created_at,
            'archivo', ir.nombre_archivo,
            'filas', ir.total_filas,
            'estado', ir.estado,
            'usuario', au.nombre_completo
        )
    ) INTO import_history
    FROM import_runs ir
    LEFT JOIN auth_users au ON ir.usuario_id = au.id
    ORDER BY ir.created_at DESC
    LIMIT 10;
    
    -- Construir respuesta
    result := json_build_object(
        'kpis', COALESCE(global_kpis, '{}'::json),
        'zonas', COALESCE(zonas_data, '[]'::json),
        'import_history', COALESCE(import_history, '[]'::json)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar datos antes de importar
CREATE OR REPLACE FUNCTION clear_daily_data()
RETURNS void AS $$
BEGIN
    -- Eliminar asignaciones del día actual
    DELETE FROM asignaciones WHERE fecha_reporte = CURRENT_DATE;
    
    -- Log de la operación
    INSERT INTO import_runs (usuario_id, nombre_archivo, total_filas, estado, mensaje_error)
    VALUES (
        (SELECT id FROM auth_users WHERE rol = 'admin' LIMIT 1),
        'Limpieza diaria - ' || CURRENT_DATE::text,
        0,
        'completado',
        'Datos del día ' || CURRENT_DATE::text || ' eliminados correctamente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para procesar archivo Excel
CREATE OR REPLACE FUNCTION process_excel_upload(
    p_usuario_id UUID,
    p_nombre_archivo TEXT,
    p_datos JSONB
)
RETURNS JSON AS $$
DECLARE
    import_run_id UUID;
    fila RECORD;
    vendedor_id UUID;
    cliente_id UUID;
    categoria_id UUID;
    filas_procesadas INTEGER := 0;
    filas_insertadas INTEGER := 0;
    errores TEXT[] := '{}';
BEGIN
    -- Crear registro de importación
    INSERT INTO import_runs (usuario_id, nombre_archivo, total_filas, estado)
    VALUES (p_usuario_id, p_nombre_archivo, jsonb_array_length(p_datos), 'iniciado')
    RETURNING id INTO import_run_id;
    
    -- Procesar cada fila del Excel
    FOR fila IN SELECT * FROM jsonb_to_recordset(p_datos) AS x(
        supervisor TEXT,
        vendedor TEXT,
        ruta TEXT,
        cliente TEXT,
        ensure TEXT,
        chocolate TEXT,
        alpina TEXT,
        super_alim TEXT,
        condicionate TEXT
    )
    LOOP
        filas_procesadas := filas_procesadas + 1;
        
        BEGIN
            -- Buscar vendedor por código
            SELECT v.id INTO vendedor_id
            FROM vendedores v
            WHERE v.codigo = TRIM(SPLIT_PART(fila.vendedor, '-', 1));
            
            IF vendedor_id IS NULL THEN
                errores := array_append(errores, 'Fila ' || filas_procesadas || ': Vendedor no encontrado - ' || fila.vendedor);
                CONTINUE;
            END IF;
            
            -- Buscar cliente por código
            SELECT c.id INTO cliente_id
            FROM clientes c
            WHERE c.codigo = TRIM(SPLIT_PART(fila.cliente, '-', 1));
            
            IF cliente_id IS NULL THEN
                errores := array_append(errores, 'Fila ' || filas_procesadas || ': Cliente no encontrado - ' || fila.cliente);
                CONTINUE;
            END IF;
            
            -- Procesar cada categoría
            -- ENSURE
            IF fila.ensure = 'Activado' THEN
                SELECT id INTO categoria_id FROM categorias WHERE codigo = 'CAT001';
                IF categoria_id IS NOT NULL THEN
                    INSERT INTO asignaciones (fecha_reporte, vendedor_id, cliente_id, categoria_id, estado_activacion)
                    VALUES (CURRENT_DATE, vendedor_id, cliente_id, categoria_id, 'activado')
                    ON CONFLICT (fecha_reporte, vendedor_id, cliente_id, categoria_id) 
                    DO UPDATE SET estado_activacion = 'activado';
                    filas_insertadas := filas_insertadas + 1;
                END IF;
            END IF;
            
            -- CHOCOLATE
            IF fila.chocolate = 'Activado' THEN
                SELECT id INTO categoria_id FROM categorias WHERE codigo = 'CAT002';
                IF categoria_id IS NOT NULL THEN
                    INSERT INTO asignaciones (fecha_reporte, vendedor_id, cliente_id, categoria_id, estado_activacion)
                    VALUES (CURRENT_DATE, vendedor_id, cliente_id, categoria_id, 'activado')
                    ON CONFLICT (fecha_reporte, vendedor_id, cliente_id, categoria_id) 
                    DO UPDATE SET estado_activacion = 'activado';
                    filas_insertadas := filas_insertadas + 1;
                END IF;
            END IF;
            
            -- ALPINA
            IF fila.alpina = 'Activado' THEN
                SELECT id INTO categoria_id FROM categorias WHERE codigo = 'CAT003';
                IF categoria_id IS NOT NULL THEN
                    INSERT INTO asignaciones (fecha_reporte, vendedor_id, cliente_id, categoria_id, estado_activacion)
                    VALUES (CURRENT_DATE, vendedor_id, cliente_id, categoria_id, 'activado')
                    ON CONFLICT (fecha_reporte, vendedor_id, cliente_id, categoria_id) 
                    DO UPDATE SET estado_activacion = 'activado';
                    filas_insertadas := filas_insertadas + 1;
                END IF;
            END IF;
            
            -- SUPER DE ALIM
            IF fila.super_alim = 'Activado' THEN
                SELECT id INTO categoria_id FROM categorias WHERE codigo = 'CAT004';
                IF categoria_id IS NOT NULL THEN
                    INSERT INTO asignaciones (fecha_reporte, vendedor_id, cliente_id, categoria_id, estado_activacion)
                    VALUES (CURRENT_DATE, vendedor_id, cliente_id, categoria_id, 'activado')
                    ON CONFLICT (fecha_reporte, vendedor_id, cliente_id, categoria_id) 
                    DO UPDATE SET estado_activacion = 'activado';
                    filas_insertadas := filas_insertadas + 1;
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            errores := array_append(errores, 'Fila ' || filas_procesadas || ': Error - ' || SQLERRM);
        END;
    END LOOP;
    
    -- Actualizar registro de importación
    UPDATE import_runs 
    SET 
        filas_procesadas = filas_procesadas,
        filas_insertadas = filas_insertadas,
        estado = CASE WHEN array_length(errores, 1) > 0 THEN 'error' ELSE 'completado' END,
        mensaje_error = CASE WHEN array_length(errores, 1) > 0 THEN array_to_string(errores, '; ') ELSE NULL END,
        completed_at = NOW()
    WHERE id = import_run_id;
    
    -- Refrescar vistas materializadas
    PERFORM refresh_materialized_views();
    
    RETURN json_build_object(
        'success', true,
        'import_run_id', import_run_id,
        'filas_procesadas', filas_procesadas,
        'filas_insertadas', filas_insertadas,
        'errores', errores
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos a las funciones
GRANT EXECUTE ON FUNCTION get_vendedor_dashboard_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_supervisor_dashboard_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_daily_data() TO authenticated;
GRANT EXECUTE ON FUNCTION process_excel_upload(UUID, TEXT, JSONB) TO authenticated;
