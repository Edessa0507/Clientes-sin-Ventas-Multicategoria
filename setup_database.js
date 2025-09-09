// Script para configurar la base de datos con las funciones necesarias
const SUPABASE_URL = 'https://xaohatfpnsoszduxgdyp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTMxMzIsImV4cCI6MjA3Mjg2OTEzMn0.7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI'

async function setupDatabase() {
  try {
    console.log('Configurando base de datos...')
    
    // Crear funciones RPC usando la API REST de Supabase
    const functions = [
      {
        name: 'get_vendedor_dashboard_data',
        sql: `
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
              
              -- Obtener clientes con sus categorías (datos mock por ahora)
              SELECT json_agg(
                  json_build_object(
                      'id', 'CLI' || generate_series,
                      'nombre', 'Cliente ' || generate_series,
                      'ruta', 'Ruta ' || generate_series,
                      'categorias', json_build_object(
                          'ensure', CASE WHEN random() > 0.5 THEN 'Activado' ELSE 'Falta' END,
                          'chocolate', CASE WHEN random() > 0.5 THEN 'Activado' ELSE 'Falta' END,
                          'alpina', CASE WHEN random() > 0.5 THEN 'Activado' ELSE 'Falta' END,
                          'superAlim', CASE WHEN random() > 0.5 THEN 'Activado' ELSE 'Falta' END
                      )
                  )
              ) INTO clientes_data
              FROM generate_series(1, 10);
              
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
        `
      },
      {
        name: 'get_supervisor_dashboard_data',
        sql: `
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
              
              -- Obtener vendedores del supervisor (datos mock)
              SELECT json_agg(
                  json_build_object(
                      'id', 'V' || generate_series,
                      'codigo', 'E' || lpad(generate_series::text, 3, '0'),
                      'nombre', 'Vendedor ' || generate_series,
                      'progreso', floor(random() * 100)
                  )
              ) INTO vendedores_data
              FROM generate_series(1, 5);
              
              -- Obtener KPIs de la zona (datos mock)
              SELECT json_build_object(
                  'total_vendedores', 5,
                  'total_clientes', 25,
                  'progreso_zona', 75,
                  'clientes_activos', 20
              ) INTO kpis_data;
              
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
        `
      },
      {
        name: 'get_admin_dashboard_data',
        sql: `
          CREATE OR REPLACE FUNCTION get_admin_dashboard_data()
          RETURNS JSON AS $$
          DECLARE
              result JSON;
              global_kpis JSON;
              zonas_data JSON;
              import_history JSON;
          BEGIN
              -- Obtener KPIs globales (datos mock)
              SELECT json_build_object(
                  'total_zonas', 3,
                  'total_vendedores', 15,
                  'total_supervisores', 3,
                  'total_clientes', 75,
                  'progreso_global', 80,
                  'ultima_importacion', NOW()
              ) INTO global_kpis;
              
              -- Obtener datos por zona (datos mock)
              SELECT json_agg(
                  json_build_object(
                      'id', 'Z' || generate_series,
                      'nombre', 'Zona ' || generate_series,
                      'vendedores', 5,
                      'clientes', 25,
                      'progreso', floor(random() * 100)
                  )
              ) INTO zonas_data
              FROM generate_series(1, 3);
              
              -- Obtener historial de importaciones (datos mock)
              SELECT json_agg(
                  json_build_object(
                      'id', 'I' || generate_series,
                      'fecha', NOW() - (generate_series || ' days')::interval,
                      'archivo', 'datos_' || generate_series || '.xlsx',
                      'filas', 100 + generate_series * 10,
                      'estado', 'completado',
                      'usuario', 'ADMIN001'
                  )
              ) INTO import_history
              FROM generate_series(1, 5);
              
              -- Construir respuesta
              result := json_build_object(
                  'kpis', COALESCE(global_kpis, '{}'::json),
                  'zonas', COALESCE(zonas_data, '[]'::json),
                  'import_history', COALESCE(import_history, '[]'::json)
              );
              
              RETURN result;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      }
    ]

    // Ejecutar cada función
    for (const func of functions) {
      console.log(`Creando función: ${func.name}`)
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          sql: func.sql
        })
      })

      if (response.ok) {
        console.log(`✅ Función ${func.name} creada exitosamente`)
      } else {
        const error = await response.text()
        console.log(`❌ Error creando ${func.name}:`, error)
      }
    }

    console.log('✅ Configuración de base de datos completada')
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

setupDatabase()
