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

    // Normalizador robusto de nombres (quita espacios extra, mayúsculas y acentos)
    const normalizeName = (value: unknown): string => {
      const str = (value ?? '').toString().trim();
      const upper = str.normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toUpperCase()
        .replace(/\s+/g, ' ');
      return upper;
    };

    // Procesar datos de manera robusta y en lotes
    console.log(`Procesando ${datos.length} filas de datos...`);

    let filasInsertables = 0;
    let filasInsertadas = 0;
    const errores: string[] = [];

    // 1) Extraer nombres únicos normalizados de vendedores y clientes
    const vendedoresNormSet = new Set<string>();
    const clientesNormSet = new Set<string>();

    for (const fila of datos) {
      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);
      if (vendedorNorm) vendedoresNormSet.add(vendedorNorm);
      if (clienteNorm) clientesNormSet.add(clienteNorm);
    }

    console.log(`Nombres únicos (normalizados) → vendedores: ${vendedoresNormSet.size}, clientes: ${clientesNormSet.size}`);

    // 2) Prefetch global y construir mapas normalizados nombre→id
    const vendedorNombreToId = new Map<string, string>();
    const clienteNombreToId = new Map<string, string>();

    // Vendedores
    {
      const { data, error } = await supabaseAdmin
        .from('vendedores')
        .select('id,nombre');
      if (error) {
        console.error('Error obteniendo vendedores:', error);
        throw new Error('No se pudieron obtener vendedores');
      }
      (data ?? []).forEach((row: { id: string; nombre: string }) => {
        vendedorNombreToId.set(normalizeName(row.nombre), row.id);
      });
    }

    // Clientes
    {
      const { data, error } = await supabaseAdmin
        .from('clientes')
        .select('id,nombre');
      if (error) {
        console.error('Error obteniendo clientes:', error);
        throw new Error('No se pudieron obtener clientes');
      }
      (data ?? []).forEach((row: { id: string; nombre: string }) => {
        clienteNombreToId.set(normalizeName(row.nombre), row.id);
      });
    }

    // 3) Construir asignaciones a insertar
    type Asignacion = {
      vendedor_id: string
      cliente_id: string
      fecha_reporte: string
      estado_activacion: string
      ensure?: number
      chocolate?: number
      alpina?: number
      super_de_alim?: number
      condicionate?: number
    };

    const hoy = new Date().toISOString().split('T')[0];

    // Limpiar asignaciones del día para evitar duplicados
    try {
      const { error: delErr } = await supabaseAdmin
        .from('asignaciones')
        .delete()
        .eq('fecha_reporte', hoy);
      if (delErr) {
        console.warn('No se pudieron limpiar asignaciones del día:', delErr);
      }
    } catch (e) {
      console.warn('Excepción limpiando asignaciones del día:', e);
    }

    const asignaciones: Asignacion[] = [];

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);

      const vendedorId = vendedorNombreToId.get(vendedorNorm);
      const clienteId = clienteNombreToId.get(clienteNorm);

      if (!vendedorId || !clienteId) {
        errores.push(`Fila ${i + 1}: Vendedor o cliente no encontrado (Vendedor: ${fila.vendedor || '-'}, Cliente: ${fila.cliente || '-'})`);
        continue;
      }

      const asignacion: Asignacion = {
        vendedor_id: vendedorId,
        cliente_id: clienteId,
        fecha_reporte: hoy,
        estado_activacion: 'pendiente'
      };

      const toNum = (v: any) => {
        if (v === undefined || v === null || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const ensure = toNum(fila.ensure);
      const chocolate = toNum(fila.chocolate);
      const alpina = toNum(fila.alpina);
      const superDeAlim = toNum(fila.super_de_alim ?? fila['super_de_alim']);
      const condicionate = toNum(fila.condicionate);

      if (ensure !== undefined) asignacion.ensure = ensure;
      if (chocolate !== undefined) asignacion.chocolate = chocolate;
      if (alpina !== undefined) asignacion.alpina = alpina;
      if (superDeAlim !== undefined) asignacion.super_de_alim = superDeAlim;
      if (condicionate !== undefined) asignacion.condicionate = condicionate;

      asignaciones.push(asignacion);
    }

    filasInsertables = asignaciones.length;
    console.log(`Asignaciones a insertar: ${filasInsertables}`);

    // 4) Insertar en lotes
    const batchSize = 500;
    for (let i = 0; i < asignaciones.length; i += batchSize) {
      const batch = asignaciones.slice(i, i + batchSize);
      const { error } = await supabaseAdmin
        .from('asignaciones')
        .insert(batch);
      if (error) {
        console.error(`Error insertando lote ${i / batchSize + 1}:`, error);
        errores.push(`Error insertando lote ${i / batchSize + 1}: ${error.message}`);
      } else {
        filasInsertadas += batch.length;
      }
    }

    // Intentar refrescar vistas materializadas si existe la RPC
    try {
      await supabaseAdmin.rpc('refresh_materialized_views');
    } catch (_) {
      // opcional
    }

    const result = {
      success: true,
      filas_procesadas: datos.length,
      filas_insertables: filasInsertables,
      filas_insertadas: filasInsertadas,
      errores
    };

    console.log('Datos procesados exitosamente:', result);

    // Respuesta exitosa
    const response: UploadResponse = {
      success: true,
      message: `Archivo procesado. Insertadas ${result.filas_insertadas}/${result.filas_insertables}.`,
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
