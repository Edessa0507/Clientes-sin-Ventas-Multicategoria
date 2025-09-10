/// <reference path="../types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

interface UploadRequest {
  usuario_id: string
  nombre_archivo: string
  datos: any[]
}

interface UploadResponse {
  success: boolean
  message?: string
  import_run_id?: string
  filas_procesadas?: number
  filas_insertadas?: number
  errores?: string[]
}

// Definir tipos para el entorno de Deno
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req: Request): Promise<Response> => {
  console.log('=== Inicio de solicitud a excel-upload ===');
  console.log('Método:', req.method);
  console.log('URL:', req.url);

  // Obtener headers CORS basados en el origen
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = getCorsHeaders(origin);

  // Función para manejar errores de manera consistente
  const handleError = (error: unknown, context: string): Response => {
    console.error(`Error en ${context}:`, error);
    
    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('no encontrado') || 
          error.message.includes('no existe')) {
        statusCode = 404;
      } else if (error.message.includes('no autorizado') ||
                error.message.includes('credenciales')) {
        statusCode = 401;
      } else if (error.message.includes('no válido') ||
                error.message.includes('inválido')) {
        statusCode = 400;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  };

  // Permitir preflight
  if (req.method === 'OPTIONS') {
    console.log('Respuesta a solicitud OPTIONS (preflight)');
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400'
      } 
    });
  }

  // Solo permitir método POST
  if (req.method !== 'POST') {
    return handleError(new Error('Método no permitido'), 'validación de método HTTP');
  }

  try {
    console.log('Procesando solicitud de carga de Excel...');
    
    // Parsear el cuerpo de la solicitud
    let body;
    try {
      body = await req.json();
      console.log('Cuerpo de la solicitud recibido');
      console.log('Datos recibidos:', JSON.stringify(body, null, 2));
    } catch (e) {
      return handleError(e, 'análisis del cuerpo de la solicitud');
    }

    // Validar datos requeridos
    const { usuario_id, nombre_archivo, datos }: UploadRequest = body;
    
    if (!usuario_id || !nombre_archivo || !datos) {
      return handleError(new Error('Datos requeridos faltantes'), 'validación de datos');
    }

    if (!Array.isArray(datos) || datos.length === 0) {
      return handleError(new Error('No hay datos para procesar'), 'validación de datos');
    }

    // Crear cliente Supabase con service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xaohatfpnsoszduxgdyp.supabase.co';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI5MzEzMiwiZXhwIjoyMDcyODY5MTMyfQ._7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI';
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    ) as SupabaseClient;

    console.log('Cliente Supabase creado correctamente');

    // Limpiar datos existentes
    console.log('Limpiando datos existentes...');
    try {
      const { error: clearError } = await supabaseAdmin.rpc('clear_daily_data');
      if (clearError) {
        console.warn('Advertencia al limpiar datos:', clearError);
        // No fallar si no se puede limpiar, continuar con el procesamiento
      }
    } catch (clearErr) {
      console.warn('No se pudo ejecutar clear_daily_data, continuando sin limpiar:', clearErr);
    }

    // Procesar datos
    console.log(`Procesando ${datos.length} filas de datos...`);
    
    // Intentar usar la función RPC primero
    let result;
    let processError;
    
    try {
      const rpcResult = await supabaseAdmin.rpc('process_excel_upload', {
        p_usuario_id: usuario_id,
        p_nombre_archivo: nombre_archivo,
        p_datos: datos
      });
      result = rpcResult.data;
      processError = rpcResult.error;
    } catch (rpcErr) {
      console.warn('Función RPC no disponible, usando método alternativo:', rpcErr);
      processError = rpcErr;
    }

    // Si la función RPC falla, usar método alternativo
    if (processError) {
      console.log('Usando método alternativo para procesar datos...');
      
      // Crear registro de importación manualmente
      const { data: importRun, error: importError } = await supabaseAdmin
        .from('import_runs')
        .insert({
          usuario_id: usuario_id,
          nombre_archivo: nombre_archivo,
          total_filas: datos.length,
          estado: 'procesando'
        })
        .select()
        .single();

      if (importError) {
        console.error('Error creando registro de importación:', importError);
        throw new Error('Error al crear registro de importación');
      }

      // Procesar datos manualmente
      let filas_insertadas = 0;
      const errores: string[] = [];

      console.log(`Procesando ${datos.length} filas de datos manualmente...`);

      for (let i = 0; i < datos.length; i++) {
        try {
          const fila = datos[i];
          console.log(`Procesando fila ${i + 1}:`, fila);
          
          // Buscar vendedor
          let vendedor_id = null;
          if (fila.vendedor && fila.vendedor.trim()) {
            const { data: vendedor, error: vendedorError } = await supabaseAdmin
              .from('vendedores')
              .select('id')
              .eq('nombre', fila.vendedor.trim())
              .single();
            
            if (vendedorError) {
              console.log(`Vendedor no encontrado: ${fila.vendedor}`, vendedorError);
            } else {
              vendedor_id = vendedor.id;
              console.log(`Vendedor encontrado: ${fila.vendedor} -> ${vendedor_id}`);
            }
          }

          // Buscar cliente
          let cliente_id = null;
          if (fila.cliente && fila.cliente.trim()) {
            const { data: cliente, error: clienteError } = await supabaseAdmin
              .from('clientes')
              .select('id')
              .eq('nombre', fila.cliente.trim())
              .single();
            
            if (clienteError) {
              console.log(`Cliente no encontrado: ${fila.cliente}`, clienteError);
            } else {
              cliente_id = cliente.id;
              console.log(`Cliente encontrado: ${fila.cliente} -> ${cliente_id}`);
            }
          }

          // Insertar asignación si tenemos vendedor y cliente
          if (vendedor_id && cliente_id) {
            const asignacionData: any = {
              vendedor_id: vendedor_id,
              cliente_id: cliente_id,
              fecha_reporte: new Date().toISOString().split('T')[0],
              estado_activacion: 'pendiente'
            };

            // Agregar datos de productos si existen (convertir a números)
            if (fila.ensure !== undefined && fila.ensure !== '') {
              asignacionData.ensure = parseInt(fila.ensure) || 0;
            }
            if (fila.chocolate !== undefined && fila.chocolate !== '') {
              asignacionData.chocolate = parseInt(fila.chocolate) || 0;
            }
            if (fila.alpina !== undefined && fila.alpina !== '') {
              asignacionData.alpina = parseInt(fila.alpina) || 0;
            }
            if (fila.super_de_alim !== undefined && fila.super_de_alim !== '') {
              asignacionData.super_de_alim = parseInt(fila.super_de_alim) || 0;
            }
            if (fila.condicionate !== undefined && fila.condicionate !== '') {
              asignacionData.condicionate = parseInt(fila.condicionate) || 0;
            }

            console.log(`Insertando asignación:`, asignacionData);

            const { error: insertError } = await supabaseAdmin
              .from('asignaciones')
              .insert(asignacionData);

            if (!insertError) {
              filas_insertadas++;
              console.log(`Asignación insertada exitosamente para fila ${i + 1}`);
            } else {
              errores.push(`Fila ${i + 1}: ${insertError.message}`);
              console.error(`Error insertando asignación para fila ${i + 1}:`, insertError);
            }
          } else {
            const errorMsg = `Fila ${i + 1}: Vendedor o cliente no encontrado (Vendedor: ${fila.vendedor}, Cliente: ${fila.cliente})`;
            errores.push(errorMsg);
            console.log(errorMsg);
          }
        } catch (rowError) {
          const errorMsg = `Fila ${i + 1}: ${rowError.message}`;
          errores.push(errorMsg);
          console.error(errorMsg, rowError);
        }
      }

      // Actualizar registro de importación
      await supabaseAdmin
        .from('import_runs')
        .update({
          estado: 'completado',
          filas_procesadas: datos.length,
          filas_insertadas: filas_insertadas,
          completed_at: new Date().toISOString(),
          mensaje_error: errores.length > 0 ? errores.join('; ') : null
        })
        .eq('id', importRun.id);

      result = {
        success: true,
        import_run_id: importRun.id,
        filas_procesadas: datos.length,
        filas_insertadas: filas_insertadas,
        errores: errores
      };
    }

    console.log('Datos procesados exitosamente:', result);

    // Respuesta exitosa
    const response: UploadResponse = {
      success: true,
      message: `Archivo procesado exitosamente. ${result.filas_insertadas} registros insertados.`,
      import_run_id: result.import_run_id,
      filas_procesadas: result.filas_procesadas,
      filas_insertadas: result.filas_insertadas,
      errores: result.errores
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    return handleError(error, 'manejo de solicitud de carga de Excel');
  }
});
