/// <reference path="../types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

interface UploadRequest {
  usuario_id: string
  nombre_archivo: string
  datos: any[]
}

interface UploadResponse {
  success: boolean
  message?: string
  filas_procesadas?: number
  filas_insertadas?: number
  errores?: string[]
}

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
      console.log('Tipo de datos:', typeof body);
      console.log('Claves del objeto:', Object.keys(body || {}));
    } catch (e) {
      console.error('Error parseando JSON:', e);
      return handleError(e, 'análisis del cuerpo de la solicitud');
    }

    // Validar datos requeridos
    const { usuario_id, nombre_archivo, datos }: UploadRequest = body;
    
    console.log('usuario_id:', usuario_id);
    console.log('nombre_archivo:', nombre_archivo);
    console.log('datos es array:', Array.isArray(datos));
    console.log('datos length:', datos?.length);
    
    if (!usuario_id || !nombre_archivo || !datos) {
      return handleError(new Error('Datos requeridos faltantes'), 'validación de datos');
    }

    if (!Array.isArray(datos) || datos.length === 0) {
      return handleError(new Error('No hay datos para procesar'), 'validación de datos');
    }

    console.log('Datos válidos recibidos, procesando...');
    
    // Crear cliente Supabase con service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xaohatfpnsoszduxgdyp.supabase.co';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI5MzEzMiwiZXhwIjoyMDcyODY5MTMyfQ._7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI';
    
    console.log('Creando cliente Supabase...');
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    console.log('Cliente Supabase creado correctamente');

    // Normalizador de nombres
    const normalizeName = (value: unknown): string => {
      const str = (value ?? '').toString().trim();
      return str.normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toUpperCase()
        .replace(/\s+/g, ' ');
    };

    // Obtener vendedores y clientes existentes
    console.log('Obteniendo vendedores...');
    const { data: vendedores, error: errorVendedores } = await supabaseAdmin
      .from('vendedores')
      .select('id, nombre');
    
    if (errorVendedores) {
      console.error('Error obteniendo vendedores:', errorVendedores);
      throw new Error('No se pudieron obtener vendedores');
    }

    console.log('Obteniendo clientes...');
    const { data: clientes, error: errorClientes } = await supabaseAdmin
      .from('clientes')
      .select('id, nombre');
    
    if (errorClientes) {
      console.error('Error obteniendo clientes:', errorClientes);
      throw new Error('No se pudieron obtener clientes');
    }

    // Crear mapas de nombres normalizados a IDs
    const vendedorMap = new Map<string, string>();
    const clienteMap = new Map<string, string>();

    (vendedores || []).forEach((v: any) => {
      vendedorMap.set(normalizeName(v.nombre), v.id);
    });

    (clientes || []).forEach((c: any) => {
      clienteMap.set(normalizeName(c.nombre), c.id);
    });

    console.log(`Vendedores cargados: ${vendedorMap.size}`);
    console.log(`Clientes cargados: ${clienteMap.size}`);

    // Limpiar asignaciones del día
    const hoy = new Date().toISOString().split('T')[0];
    console.log('Limpiando asignaciones del día:', hoy);
    
    const { error: deleteError } = await supabaseAdmin
      .from('asignaciones')
      .delete()
      .eq('fecha_reporte', hoy);
    
    if (deleteError) {
      console.warn('Error limpiando asignaciones:', deleteError);
    } else {
      console.log('Asignaciones del día limpiadas');
    }

    // Procesar datos
    const asignaciones: any[] = [];
    const errores: string[] = [];

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);

      const vendedorId = vendedorMap.get(vendedorNorm);
      const clienteId = clienteMap.get(clienteNorm);

      if (!vendedorId || !clienteId) {
        errores.push(`Fila ${i + 1}: Vendedor o cliente no encontrado (V: ${fila.vendedor}, C: ${fila.cliente})`);
        continue;
      }

      const asignacion: any = {
        vendedor_id: vendedorId,
        cliente_id: clienteId,
        fecha_reporte: hoy,
        estado_activacion: 'pendiente'
      };

      // Procesar productos
      const toNum = (v: any) => {
        if (v === undefined || v === null || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const ensure = toNum(fila.ensure);
      const chocolate = toNum(fila.chocolate);
      const alpina = toNum(fila.alpina);
      const superDeAlim = toNum(fila.super_de_alim);
      const condicionate = toNum(fila.condicionate);

      if (ensure !== undefined) asignacion.ensure = ensure;
      if (chocolate !== undefined) asignacion.chocolate = chocolate;
      if (alpina !== undefined) asignacion.alpina = alpina;
      if (superDeAlim !== undefined) asignacion.super_de_alim = superDeAlim;
      if (condicionate !== undefined) asignacion.condicionate = condicionate;

      asignaciones.push(asignacion);
    }

    console.log(`Asignaciones a insertar: ${asignaciones.length}`);

    // Insertar en lotes
    let filasInsertadas = 0;
    const batchSize = 500;
    
    for (let i = 0; i < asignaciones.length; i += batchSize) {
      const batch = asignaciones.slice(i, i + batchSize);
      const { error: insertError } = await supabaseAdmin
        .from('asignaciones')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error insertando lote ${i / batchSize + 1}:`, insertError);
        errores.push(`Error insertando lote ${i / batchSize + 1}: ${insertError.message}`);
      } else {
        filasInsertadas += batch.length;
        console.log(`Lote ${i / batchSize + 1} insertado: ${batch.length} registros`);
      }
    }

    // Intentar refrescar vistas
    try {
      await supabaseAdmin.rpc('refresh_materialized_views');
      console.log('Vistas materializadas refrescadas');
    } catch (e) {
      console.log('No se pudo refrescar vistas (opcional):', e);
    }

    const result = {
      success: true,
      filas_procesadas: datos.length,
      filas_insertadas: filasInsertadas,
      errores
    };

    console.log('Procesamiento completado:', result);

    // Respuesta exitosa
    const response: UploadResponse = {
      success: true,
      message: `Archivo procesado exitosamente. ${filasInsertadas} registros insertados de ${asignaciones.length} procesables.`,
      filas_procesadas: datos.length,
      filas_insertadas: filasInsertadas,
      errores: errores
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
    console.error('Error general:', error);
    return handleError(error, 'manejo de solicitud de carga de Excel');
  }
});