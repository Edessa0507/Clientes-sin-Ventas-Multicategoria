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
  debug_info?: any
}

serve(async (req: Request): Promise<Response> => {
  console.log('=== INICIO EXCEL-UPLOAD ===');
  
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = getCorsHeaders(origin);

  const handleError = (error: unknown, context: string): Response => {
    console.error(`ERROR en ${context}:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        context: context
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  };

  try {
    // OPTIONS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Solo POST
    if (req.method !== 'POST') {
      return handleError(new Error('Método no permitido'), 'validación método');
    }

    console.log('Procesando POST...');

    // Parsear JSON
    let body;
    try {
      body = await req.json();
      console.log('JSON parseado correctamente');
    } catch (e) {
      return handleError(e, 'parseo JSON');
    }

    // Validar datos
    const { usuario_id, nombre_archivo, datos } = body;
    
    if (!usuario_id || !nombre_archivo || !datos) {
      return handleError(new Error('Datos requeridos faltantes'), 'validación datos');
    }

    if (!Array.isArray(datos) || datos.length === 0) {
      return handleError(new Error('No hay datos para procesar'), 'validación datos');
    }

    console.log(`Datos válidos: ${datos.length} filas`);

    // Crear cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xaohatfpnsoszduxgdyp.supabase.co';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI5MzEzMiwiZXhwIjoyMDcyODY5MTMyfQ._7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI';
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('Cliente Supabase creado');

    // Obtener vendedores
    const { data: vendedores, error: errorVendedores } = await supabaseAdmin
      .from('vendedores')
      .select('id, codigo, nombre_completo');
    
    if (errorVendedores) {
      return handleError(errorVendedores, 'obtener vendedores');
    }

    console.log(`Vendedores obtenidos: ${vendedores?.length || 0}`);

    // Obtener clientes
    const { data: clientes, error: errorClientes } = await supabaseAdmin
      .from('clientes')
      .select('id, codigo, nombre');
    
    if (errorClientes) {
      return handleError(errorClientes, 'obtener clientes');
    }

    console.log(`Clientes obtenidos: ${clientes?.length || 0}`);

    // Obtener categorías
    const { data: categorias, error: errorCategorias } = await supabaseAdmin
      .from('categorias')
      .select('id, codigo, nombre');
    
    if (errorCategorias) {
      return handleError(errorCategorias, 'obtener categorías');
    }

    console.log(`Categorías obtenidas: ${categorias?.length || 0}`);

    // Normalizador mejorado para extraer nombres después de prefijos
    const normalizeName = (value: unknown): string => {
      let str = (value ?? '').toString().trim();
      
      // Extraer nombre después de "CODIGO - " (para vendedores y clientes)
      const match = str.match(/^[A-Z0-9\s-]+\s*-\s*(.+)$/);
      if (match) {
        str = match[1].trim(); // Usar solo la parte después del guión
      }
      
      return str.normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toUpperCase()
        .replace(/\s+/g, ' ');
    };

    // Crear mapas
    const vendedorMap = new Map<string, string>();
    const clienteMap = new Map<string, string>();

    (vendedores || []).forEach((v: any) => {
      vendedorMap.set(normalizeName(v.nombre_completo), v.id);
      vendedorMap.set(normalizeName(v.codigo), v.id);
    });

    (clientes || []).forEach((c: any) => {
      clienteMap.set(normalizeName(c.nombre), c.id);
      clienteMap.set(normalizeName(c.codigo), c.id);
    });

    console.log(`Mapas creados - V: ${vendedorMap.size}, C: ${clienteMap.size}`);

    // Debug: Mostrar algunos vendedores y clientes
    const debugVendedores = (vendedores || []).slice(0, 3).map(v => ({
      codigo: v.codigo,
      nombre_completo: v.nombre_completo,
      normalizado: normalizeName(v.nombre_completo)
    }));

    const debugClientes = (clientes || []).slice(0, 3).map(c => ({
      codigo: c.codigo,
      nombre: c.nombre,
      normalizado: normalizeName(c.nombre)
    }));

    // Procesar datos
    const asignaciones: any[] = [];
    const errores: string[] = [];
    const debugFila = datos[0]; // Primera fila para debug

    console.log('Primera fila de datos:', debugFila);

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);

      const vendedorId = vendedorMap.get(vendedorNorm);
      const clienteId = clienteMap.get(clienteNorm);

      if (!vendedorId || !clienteId) {
        errores.push(`Fila ${i + 1}: Vendedor o cliente no encontrado (V: "${fila.vendedor}" -> "${vendedorNorm}", C: "${fila.cliente}" -> "${clienteNorm}")`);
        continue;
      }

      const categoriaId = categorias?.[0]?.id;
      if (!categoriaId) {
        errores.push(`Fila ${i + 1}: No hay categorías disponibles`);
        continue;
      }

      const asignacion = {
        vendedor_id: vendedorId,
        cliente_id: clienteId,
        categoria_id: categoriaId,
        fecha_reporte: new Date().toISOString().split('T')[0],
        estado_activacion: 'pendiente'
      };

      asignaciones.push(asignacion);
    }

    console.log(`Asignaciones a insertar: ${asignaciones.length}`);
    console.log(`Errores encontrados: ${errores.length}`);

    // Crear clientes que no existen automáticamente
    const clientesACrear = new Set<string>();
    const erroresDetallados = errores.slice(0, 5);
    
    // Extraer nombres de clientes que no se encontraron
    erroresDetallados.forEach(error => {
      const match = error.match(/C: "([^"]+)"/);
      if (match) {
        clientesACrear.add(match[1]);
      }
    });

    console.log(`Clientes a crear: ${clientesACrear.size}`);
    
    // Crear clientes faltantes
    const clientesCreados = new Map<string, string>();
    if (clientesACrear.size > 0) {
      // Obtener primera zona y ruta para los nuevos clientes
      const { data: primeraZona } = await supabaseAdmin
        .from('zonas')
        .select('id')
        .eq('activa', true)
        .limit(1)
        .single();
        
      const { data: primeraRuta } = await supabaseAdmin
        .from('rutas')
        .select('id')
        .eq('activa', true)
        .limit(1)
        .single();

      if (primeraZona && primeraRuta) {
        for (const nombreCliente of clientesACrear) {
          const { data: nuevoCliente, error: errorCrear } = await supabaseAdmin
            .from('clientes')
            .insert({
              codigo: `CLI${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
              nombre: nombreCliente,
              zona_id: primeraZona.id,
              ruta_id: primeraRuta.id,
              activo: true
            })
            .select('id, nombre')
            .single();

          if (!errorCrear && nuevoCliente) {
            clienteMap.set(normalizeName(nombreCliente), nuevoCliente.id);
            clientesCreados.set(nombreCliente, nuevoCliente.id);
            console.log(`Cliente creado: ${nombreCliente} -> ${nuevoCliente.id}`);
          }
        }
      }
    }

    // Reprocesar asignaciones con los nuevos clientes
    const asignacionesFinales: any[] = [];
    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);

      const vendedorId = vendedorMap.get(vendedorNorm);
      const clienteId = clienteMap.get(clienteNorm);

      if (!vendedorId || !clienteId) {
        continue; // Saltar si aún no se puede hacer match
      }

      const categoriaId = categorias?.[0]?.id;
      if (!categoriaId) {
        continue;
      }

      const asignacion = {
        vendedor_id: vendedorId,
        cliente_id: clienteId,
        categoria_id: categoriaId,
        fecha_reporte: new Date().toISOString().split('T')[0],
        estado_activacion: 'pendiente'
      };

      asignacionesFinales.push(asignacion);
    }

    console.log(`Asignaciones finales a insertar: ${asignacionesFinales.length}`);

    // Insertar asignaciones
    let filasInsertadas = 0;
    if (asignacionesFinales.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('asignaciones')
        .insert(asignacionesFinales);
      
      if (insertError) {
        return handleError(insertError, 'insertar asignaciones');
      }
      
      filasInsertadas = asignacionesFinales.length;
      console.log(`${filasInsertadas} asignaciones insertadas`);
    }

    // Respuesta exitosa con debug info
    const response: UploadResponse = {
      success: true,
      message: `Archivo procesado exitosamente. ${filasInsertadas} registros insertados de ${datos.length} procesados.`,
      filas_procesadas: datos.length,
      filas_insertadas: filasInsertadas,
      errores: errores,
      debug_info: {
        vendedores_encontrados: vendedorMap.size,
        clientes_encontrados: clienteMap.size,
        categorias_encontradas: categorias?.length || 0,
        debug_vendedores: debugVendedores,
        debug_clientes: debugClientes,
        primera_fila: debugFila,
        errores_detallados: errores.slice(0, 5), // Primeros 5 errores
        clientes_creados: Array.from(clientesCreados.entries()).map(([nombre, id]) => ({ nombre, id }))
      }
    };

    console.log('Procesamiento completado exitosamente');

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
    return handleError(error, 'manejo general');
  }
});