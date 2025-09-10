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

    // Procesar datos de manera robusta y en lotes
    console.log(`Procesando ${datos.length} filas de datos...`);

    let filasInsertables = 0;
    let filasInsertadas = 0;
    const errores: string[] = [];

    // 1) Normalizar y extraer nombres únicos de vendedores y clientes
    const vendedoresSet = new Set<string>();
    const clientesSet = new Set<string>();

    for (const fila of datos) {
      const vendedorNombre = (fila.vendedor || '').toString().trim();
      const clienteNombre = (fila.cliente || '').toString().trim();
      if (vendedorNombre) vendedoresSet.add(vendedorNombre);
      if (clienteNombre) clientesSet.add(clienteNombre);
    }

    const vendedoresLista = Array.from(vendedoresSet);
    const clientesLista = Array.from(clientesSet);

    console.log(`Vendedores únicos: ${vendedoresLista.length}, Clientes únicos: ${clientesLista.length}`);

    // 2) Prefetch IDs de vendedores y clientes
    const vendedorNombreToId = new Map<string, string>();
    const clienteNombreToId = new Map<string, string>();

    if (vendedoresLista.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < vendedoresLista.length; i += chunkSize) {
        const chunk = vendedoresLista.slice(i, i + chunkSize);
        const { data, error } = await supabaseAdmin
          .from('vendedores')
          .select('id,nombre')
          .in('nombre', chunk);
        if (error) {
          console.error('Error prefetch vendedores:', error);
          errores.push(`Error obteniendo vendedores: ${error.message}`);
          continue;
        }
        data?.forEach((row: { id: string; nombre: string }) => vendedorNombreToId.set(row.nombre, row.id));
      }
    }

    if (clientesLista.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < clientesLista.length; i += chunkSize) {
        const chunk = clientesLista.slice(i, i + chunkSize);
        const { data, error } = await supabaseAdmin
          .from('clientes')
          .select('id,nombre')
          .in('nombre', chunk);
        if (error) {
          console.error('Error prefetch clientes:', error);
          errores.push(`Error obteniendo clientes: ${error.message}`);
          continue;
        }
        data?.forEach((row: { id: string; nombre: string }) => clienteNombreToId.set(row.nombre, row.id));
      }
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
    const asignaciones: Asignacion[] = [];

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const vendedorNombre = (fila.vendedor || '').toString().trim();
      const clienteNombre = (fila.cliente || '').toString().trim();

      const vendedorId = vendedorNombreToId.get(vendedorNombre);
      const clienteId = clienteNombreToId.get(clienteNombre);

      if (!vendedorId || !clienteId) {
        errores.push(`Fila ${i + 1}: Vendedor o cliente no encontrado (Vendedor: ${vendedorNombre || '-'}, Cliente: ${clienteNombre || '-'})`);
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
        const n = parseInt(v);
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
