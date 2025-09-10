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
  console.log('=== INICIO DEBUG EXCEL-UPLOAD ===');
  console.log('Método:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  const origin = req.headers.get('origin') || '*';
  const corsHeaders = getCorsHeaders(origin);

  const handleError = (error: unknown, context: string, debugInfo?: any): Response => {
    console.error(`❌ ERROR en ${context}:`, error);
    console.error('Debug info:', debugInfo);
    
    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        context: context,
        debug_info: debugInfo
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

  if (req.method === 'OPTIONS') {
    console.log('✅ Respuesta OPTIONS');
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400'
      } 
    });
  }

  if (req.method !== 'POST') {
    return handleError(new Error('Método no permitido'), 'validación de método HTTP');
  }

  try {
    console.log('📥 Procesando solicitud...');
    
    // 1. Parsear JSON
    let body;
    try {
      body = await req.json();
      console.log('✅ JSON parseado correctamente');
      console.log('Tipo de body:', typeof body);
      console.log('Claves del body:', Object.keys(body || {}));
      console.log('Primera fila de datos:', body?.datos?.[0]);
    } catch (e) {
      return handleError(e, 'parseo de JSON', { error: e.message });
    }

    // 2. Validar datos requeridos
    const { usuario_id, nombre_archivo, datos }: UploadRequest = body;
    
    console.log('🔍 Validando datos:');
    console.log('- usuario_id:', usuario_id, typeof usuario_id);
    console.log('- nombre_archivo:', nombre_archivo, typeof nombre_archivo);
    console.log('- datos es array:', Array.isArray(datos));
    console.log('- datos length:', datos?.length);
    
    if (!usuario_id || !nombre_archivo || !datos) {
      return handleError(new Error('Datos requeridos faltantes'), 'validación de datos', {
        usuario_id: !!usuario_id,
        nombre_archivo: !!nombre_archivo,
        datos: !!datos
      });
    }

    if (!Array.isArray(datos) || datos.length === 0) {
      return handleError(new Error('No hay datos para procesar'), 'validación de datos', {
        isArray: Array.isArray(datos),
        length: datos?.length
      });
    }

    // 3. Crear cliente Supabase
    console.log('🔗 Creando cliente Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xaohatfpnsoszduxgdyp.supabase.co';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI5MzEzMiwiZXhwIjoyMDcyODY5MTMyfQ._7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI';
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    console.log('✅ Cliente Supabase creado');

    // 4. Crear registro de import_run
    console.log('📊 Creando registro de import_run...');
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data: importRun, error: importRunError } = await supabaseAdmin
      .from('import_runs')
      .insert({
        usuario_id: usuario_id,
        nombre_archivo: nombre_archivo,
        total_filas: datos.length,
        estado: 'iniciado',
        fecha_datos: hoy
      })
      .select()
      .single();

    if (importRunError) {
      return handleError(importRunError, 'crear import_run', { error: importRunError.message });
    }

    console.log('✅ Import run creado:', importRun.id);

    // 5. Normalizador de nombres
    const normalizeName = (value: unknown): string => {
      const str = (value ?? '').toString().trim();
      return str.normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toUpperCase()
        .replace(/\s+/g, ' ');
    };

    // 6. Obtener vendedores (usar nombre_completo, no nombre)
    console.log('👥 Obteniendo vendedores...');
    const { data: vendedores, error: errorVendedores } = await supabaseAdmin
      .from('vendedores')
      .select('id, codigo, nombre_completo');
    
    if (errorVendedores) {
      return handleError(errorVendedores, 'obtener vendedores', { error: errorVendedores.message });
    }

    console.log(`✅ Vendedores obtenidos: ${vendedores?.length || 0}`);
    console.log('Primeros 3 vendedores:', vendedores?.slice(0, 3));

    // 7. Obtener clientes
    console.log('🏪 Obteniendo clientes...');
    const { data: clientes, error: errorClientes } = await supabaseAdmin
      .from('clientes')
      .select('id, codigo, nombre');
    
    if (errorClientes) {
      return handleError(errorClientes, 'obtener clientes', { error: errorClientes.message });
    }

    console.log(`✅ Clientes obtenidos: ${clientes?.length || 0}`);
    console.log('Primeros 3 clientes:', clientes?.slice(0, 3));

    // 8. Obtener categorías
    console.log('📦 Obteniendo categorías...');
    const { data: categorias, error: errorCategorias } = await supabaseAdmin
      .from('categorias')
      .select('id, codigo, nombre');
    
    if (errorCategorias) {
      return handleError(errorCategorias, 'obtener categorías', { error: errorCategorias.message });
    }

    console.log(`✅ Categorías obtenidas: ${categorias?.length || 0}`);
    console.log('Categorías:', categorias);

    // 9. Crear mapas de búsqueda
    const vendedorMap = new Map<string, string>();
    const clienteMap = new Map<string, string>();
    const categoriaMap = new Map<string, string>();

    (vendedores || []).forEach((v: any) => {
      vendedorMap.set(normalizeName(v.nombre_completo), v.id);
      vendedorMap.set(normalizeName(v.codigo), v.id);
    });

    (clientes || []).forEach((c: any) => {
      clienteMap.set(normalizeName(c.nombre), c.id);
      clienteMap.set(normalizeName(c.codigo), c.id);
    });

    (categorias || []).forEach((cat: any) => {
      categoriaMap.set(normalizeName(cat.nombre), cat.id);
      categoriaMap.set(normalizeName(cat.codigo), cat.id);
    });

    console.log(`🗺️ Mapas creados - Vendedores: ${vendedorMap.size}, Clientes: ${clienteMap.size}, Categorías: ${categoriaMap.size}`);

    // 10. Limpiar asignaciones del día
    console.log('🧹 Limpiando asignaciones del día...');
    const { error: deleteError } = await supabaseAdmin
      .from('asignaciones')
      .delete()
      .eq('fecha_reporte', hoy);
    
    if (deleteError) {
      console.warn('⚠️ Error limpiando asignaciones:', deleteError);
    } else {
      console.log('✅ Asignaciones del día limpiadas');
    }

    // 11. Procesar datos
    console.log('⚙️ Procesando datos...');
    const asignaciones: any[] = [];
    const errores: string[] = [];
    const stagingData: any[] = [];

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const filaNumero = i + 1;
      
      console.log(`📋 Procesando fila ${filaNumero}:`, fila);

      // Guardar en staging
      stagingData.push({
        import_run_id: importRun.id,
        fila_numero: filaNumero,
        datos_originales: fila,
        estado: 'pendiente'
      });

      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);

      console.log(`🔍 Búsqueda - Vendedor: "${fila.vendedor}" -> "${vendedorNorm}"`);
      console.log(`🔍 Búsqueda - Cliente: "${fila.cliente}" -> "${clienteNorm}"`);

      const vendedorId = vendedorMap.get(vendedorNorm);
      const clienteId = clienteMap.get(clienteNorm);

      console.log(`🎯 Resultados - Vendedor ID: ${vendedorId}, Cliente ID: ${clienteId}`);

      if (!vendedorId || !clienteId) {
        const errorMsg = `Fila ${filaNumero}: Vendedor o cliente no encontrado (V: "${fila.vendedor}", C: "${fila.cliente}")`;
        errores.push(errorMsg);
        console.log(`❌ ${errorMsg}`);
        continue;
      }

      // Buscar categoría por defecto (usar la primera disponible)
      const categoriaId = categorias?.[0]?.id;
      if (!categoriaId) {
        const errorMsg = `Fila ${filaNumero}: No hay categorías disponibles`;
        errores.push(errorMsg);
        console.log(`❌ ${errorMsg}`);
        continue;
      }

      const asignacion: any = {
        vendedor_id: vendedorId,
        cliente_id: clienteId,
        categoria_id: categoriaId,
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

      if (ensure !== undefined) asignacion.ventas_recientes = ensure; // Usar ventas_recientes para ensure
      if (chocolate !== undefined) asignacion.meta_activacion = chocolate > 0; // Usar meta_activacion para chocolate
      // Los otros productos se pueden agregar como campos adicionales si es necesario

      asignaciones.push(asignacion);
      console.log(`✅ Fila ${filaNumero} procesada correctamente`);
    }

    console.log(`📊 Resumen - Asignaciones: ${asignaciones.length}, Errores: ${errores.length}`);

    // 12. Guardar en staging
    console.log('💾 Guardando en staging...');
    const { error: stagingError } = await supabaseAdmin
      .from('import_staging')
      .insert(stagingData);

    if (stagingError) {
      console.warn('⚠️ Error guardando en staging:', stagingError);
    } else {
      console.log('✅ Datos guardados en staging');
    }

    // 13. Insertar asignaciones
    let filasInsertadas = 0;
    if (asignaciones.length > 0) {
      console.log('💾 Insertando asignaciones...');
      const { error: insertError } = await supabaseAdmin
        .from('asignaciones')
        .insert(asignaciones);
      
      if (insertError) {
        return handleError(insertError, 'insertar asignaciones', { 
          error: insertError.message,
          asignaciones_count: asignaciones.length
        });
      } else {
        filasInsertadas = asignaciones.length;
        console.log(`✅ ${filasInsertadas} asignaciones insertadas`);
      }
    }

    // 14. Actualizar import_run
    console.log('📝 Actualizando import_run...');
    const { error: updateError } = await supabaseAdmin
      .from('import_runs')
      .update({
        filas_procesadas: datos.length,
        filas_insertadas: filasInsertadas,
        estado: 'completado',
        completed_at: new Date().toISOString()
      })
      .eq('id', importRun.id);

    if (updateError) {
      console.warn('⚠️ Error actualizando import_run:', updateError);
    } else {
      console.log('✅ Import run actualizado');
    }

    // 15. Respuesta exitosa
    const result = {
      success: true,
      filas_procesadas: datos.length,
      filas_insertadas: filasInsertadas,
      errores: errores,
      debug_info: {
        vendedores_encontrados: vendedorMap.size,
        clientes_encontrados: clienteMap.size,
        categorias_encontradas: categoriaMap.size,
        import_run_id: importRun.id
      }
    };

    console.log('🎉 Procesamiento completado:', result);

    const response: UploadResponse = {
      success: true,
      message: `Archivo procesado exitosamente. ${filasInsertadas} registros insertados de ${datos.length} procesados.`,
      filas_procesadas: datos.length,
      filas_insertadas: filasInsertadas,
      errores: errores,
      debug_info: result.debug_info
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
    console.error('💥 Error general:', error);
    return handleError(error, 'manejo general de la solicitud', { 
      error: error.message,
      stack: error.stack 
    });
  }
});