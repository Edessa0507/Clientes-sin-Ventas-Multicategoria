/// <reference path="../types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req: Request): Promise<Response> => {
  console.log('=== IMPORTACION OPTIMIZADA ===');
  
  const corsHeaders = getCorsHeaders(req.headers.get('origin') || '*');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { datos } = body;
    
    if (!Array.isArray(datos) || datos.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Datos vacíos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Procesando ${datos.length} filas`);

    // Cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xaohatfpnsoszduxgdyp.supabase.co';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI5MzEzMiwiZXhwIjoyMDcyODY5MTMyfQ._7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI';
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Normalizador rápido
    const normalizeName = (value: unknown): string => {
      let str = (value ?? '').toString().trim();
      const match = str.match(/^[A-Z0-9\s-]+\s*-\s*(.+)$/);
      if (match) str = match[1].trim();
      return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
    };

    // Obtener IDs por defecto (una sola consulta)
    const [zonaResult, rutaResult, categoriaResult] = await Promise.all([
      supabaseAdmin.from('zonas').select('id').eq('activa', true).limit(1).single(),
      supabaseAdmin.from('rutas').select('id').eq('activa', true).limit(1).single(),
      supabaseAdmin.from('categorias').select('id').eq('activa', true).limit(1).single()
    ]);

    const zonaId = zonaResult.data?.id;
    const rutaId = rutaResult.data?.id;
    const categoriaId = categoriaResult.data?.id;

    console.log(`IDs: Zona=${zonaId}, Ruta=${rutaId}, Categoría=${categoriaId}`);

    // Extraer datos únicos
    const vendedoresMap = new Map<string, string>();
    const clientesMap = new Map<string, string>();

    for (const fila of datos) {
      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);
      
      if (vendedorNorm && !vendedoresMap.has(vendedorNorm)) {
        vendedoresMap.set(vendedorNorm, vendedorNorm);
      }
      if (clienteNorm && !clientesMap.has(clienteNorm)) {
        clientesMap.set(clienteNorm, clienteNorm);
      }
    }

    console.log(`Vendedores únicos: ${vendedoresMap.size}, Clientes únicos: ${clientesMap.size}`);

    // Crear vendedores en lote
    const vendedoresToInsert = Array.from(vendedoresMap.entries()).map(([nombre, codigo]) => ({
      codigo: codigo.substring(0, 10),
      nombre_completo: nombre,
      zona_id: zonaId,
      activo: true
    }));

    if (vendedoresToInsert.length > 0) {
      const { data: vendedoresCreados } = await supabaseAdmin
        .from('vendedores')
        .upsert(vendedoresToInsert, { onConflict: 'nombre_completo' })
        .select('id, nombre_completo');
      
      if (vendedoresCreados) {
        vendedoresCreados.forEach(v => vendedoresMap.set(v.nombre_completo, v.id));
      }
    }

    // Crear clientes en lote
    const clientesToInsert = Array.from(clientesMap.entries()).map(([nombre, codigo]) => ({
      codigo: codigo.substring(0, 10),
      nombre: nombre,
      zona_id: zonaId,
      ruta_id: rutaId,
      activo: true
    }));

    if (clientesToInsert.length > 0) {
      const { data: clientesCreados } = await supabaseAdmin
        .from('clientes')
        .upsert(clientesToInsert, { onConflict: 'nombre' })
        .select('id, nombre');
      
      if (clientesCreados) {
        clientesCreados.forEach(c => clientesMap.set(c.nombre, c.id));
      }
    }

    // Limpiar asignaciones del día
    const hoy = new Date().toISOString().split('T')[0];
    await supabaseAdmin.from('asignaciones').delete().eq('fecha_reporte', hoy);

    // Crear asignaciones en lote
    const asignaciones = datos.map(fila => {
      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);
      
      return {
        vendedor_id: vendedoresMap.get(vendedorNorm),
        cliente_id: clientesMap.get(clienteNorm),
        categoria_id: categoriaId,
        fecha_reporte: hoy,
        estado_activacion: 'pendiente',
        ventas_recientes: Number(fila.ensure) || 0,
        meta_activacion: (Number(fila.chocolate) || 0) > 0
      };
    }).filter(a => a.vendedor_id && a.cliente_id);

    console.log(`Asignaciones válidas: ${asignaciones.length}`);

    // Insertar asignaciones
    let filasInsertadas = 0;
    if (asignaciones.length > 0) {
      const { error } = await supabaseAdmin.from('asignaciones').insert(asignaciones);
      if (!error) {
        filasInsertadas = asignaciones.length;
      }
    }

    console.log(`✅ Proceso completado: ${filasInsertadas} registros insertados`);

    return new Response(JSON.stringify({
      success: true,
      message: `Importación completada. ${filasInsertadas} registros insertados de ${datos.length} procesados.`,
      filas_procesadas: datos.length,
      filas_insertadas: filasInsertadas,
      debug_info: {
        vendedores_procesados: vendedoresMap.size,
        clientes_procesados: clientesMap.size,
        asignaciones_insertadas: filasInsertadas
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});