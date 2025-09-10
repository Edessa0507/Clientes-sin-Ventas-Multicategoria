/// <reference path="../types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req: Request): Promise<Response> => {
  console.log('=== IMPORTACION MULTICATEGORIA ===');
  
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

    // Función para extraer código y nombre del vendedor
    const parseVendedor = (vendedorDisplay: string) => {
      const match = vendedorDisplay.match(/^([A-Z0-9]+)\s*-\s*(.+)$/);
      if (match) {
        return {
          codigo: match[1].trim(),
          nombre: match[2].trim()
        };
      }
      return {
        codigo: vendedorDisplay.substring(0, 10),
        nombre: vendedorDisplay
      };
    };

    // Función para extraer código y nombre del cliente
    const parseCliente = (clienteDisplay: string) => {
      const match = clienteDisplay.match(/^([0-9]+)\s*-\s*(.+)$/);
      if (match) {
        return {
          codigo: match[1].trim(),
          nombre: match[2].trim()
        };
      }
      return {
        codigo: clienteDisplay.substring(0, 10),
        nombre: clienteDisplay
      };
    };

    // Función para mapear estado de activación
    const mapEstadoActivacion = (valor: string): 'pendiente' | 'activado' | 'no_aplica' => {
      const val = (valor || '').toString().trim().toLowerCase();
      
      if (val === 'activado') return 'activado';
      if (val === '0' || val === '0 falta' || val === 'falta') return 'pendiente';
      if (val === '0 activado') return 'activado'; // Caso especial del Excel
      
      return 'pendiente'; // Por defecto
    };

    // Obtener zonas, rutas y categorías existentes
    const [zonasResult, rutasResult, categoriasResult] = await Promise.all([
      supabaseAdmin.from('zonas').select('id, codigo, nombre').eq('activa', true),
      supabaseAdmin.from('rutas').select('id, codigo, nombre, zona_id').eq('activa', true),
      supabaseAdmin.from('categorias').select('id, codigo, nombre').eq('activa', true)
    ]);

    const zonas = zonasResult.data || [];
    const rutas = rutasResult.data || [];
    const categorias = categoriasResult.data || [];

    console.log(`Zonas: ${zonas.length}, Rutas: ${rutas.length}, Categorías: ${categorias.length}`);

    // Mapeo de categorías por nombre
    const categoriaMap = new Map<string, string>();
    categorias.forEach(cat => {
      categoriaMap.set(cat.nombre.toUpperCase(), cat.id);
      categoriaMap.set(cat.codigo.toUpperCase(), cat.id);
    });

    // Extraer datos únicos de vendedores y clientes
    const vendedoresMap = new Map<string, { codigo: string, nombre: string }>();
    const clientesMap = new Map<string, { codigo: string, nombre: string }>();

    for (const fila of datos) {
      if (fila.vendedor) {
        const vendedorParsed = parseVendedor(fila.vendedor);
        const key = `${vendedorParsed.codigo}-${vendedorParsed.nombre}`;
        if (!vendedoresMap.has(key)) {
          vendedoresMap.set(key, vendedorParsed);
        }
      }
      
      if (fila.cliente) {
        const clienteParsed = parseCliente(fila.cliente);
        const key = `${clienteParsed.codigo}-${clienteParsed.nombre}`;
        if (!clientesMap.has(key)) {
          clientesMap.set(key, clienteParsed);
        }
      }
    }

    console.log(`Vendedores únicos: ${vendedoresMap.size}, Clientes únicos: ${clientesMap.size}`);

    // Crear/actualizar vendedores
    const vendedoresToInsert = Array.from(vendedoresMap.values()).map(v => ({
      codigo: v.codigo,
      nombre_completo: v.nombre,
      zona_id: zonas[0]?.id, // Usar primera zona por defecto
      activo: true
    }));

    let vendedoresCreados: any[] = [];
    if (vendedoresToInsert.length > 0) {
      const { data: vendedoresData, error: vendedoresError } = await supabaseAdmin
        .from('vendedores')
        .upsert(vendedoresToInsert, { onConflict: 'codigo' })
        .select('id, codigo, nombre_completo');
      
      if (vendedoresError) {
        console.error('Error creando vendedores:', vendedoresError);
      } else {
        vendedoresCreados = vendedoresData || [];
      }
    }

    // Crear/actualizar clientes
    const clientesToInsert = Array.from(clientesMap.values()).map(c => ({
      codigo: c.codigo,
      nombre: c.nombre,
      zona_id: zonas[0]?.id, // Usar primera zona por defecto
      ruta_id: rutas[0]?.id, // Usar primera ruta por defecto
      activo: true
    }));

    let clientesCreados: any[] = [];
    if (clientesToInsert.length > 0) {
      const { data: clientesData, error: clientesError } = await supabaseAdmin
        .from('clientes')
        .upsert(clientesToInsert, { onConflict: 'codigo' })
        .select('id, codigo, nombre');
      
      if (clientesError) {
        console.error('Error creando clientes:', clientesError);
      } else {
        clientesCreados = clientesData || [];
      }
    }

    // Limpiar asignaciones del día actual
    const hoy = new Date().toISOString().split('T')[0];
    await supabaseAdmin.from('asignaciones').delete().eq('fecha_reporte', hoy);

    // Crear mapas de IDs para asignaciones
    const vendedorIdMap = new Map<string, string>();
    vendedoresCreados.forEach(v => {
      vendedorIdMap.set(v.codigo, v.id);
    });

    const clienteIdMap = new Map<string, string>();
    clientesCreados.forEach(c => {
      clienteIdMap.set(c.codigo, c.id);
    });

    // Procesar asignaciones por cada categoría
    const asignaciones: any[] = [];
    const categoriasExcel = ['ensure', 'chocolate', 'alpina', 'super_de_alim', 'condicionate'];

    for (const fila of datos) {
      const vendedorParsed = parseVendedor(fila.vendedor || '');
      const clienteParsed = parseCliente(fila.cliente || '');
      
      const vendedorId = vendedorIdMap.get(vendedorParsed.codigo);
      const clienteId = clienteIdMap.get(clienteParsed.codigo);

      if (!vendedorId || !clienteId) continue;

      // Procesar cada categoría
      categoriasExcel.forEach(categoriaKey => {
        const valor = fila[categoriaKey];
        if (valor !== undefined && valor !== null && valor !== '') {
          const categoriaId = categoriaMap.get(categoriaKey.toUpperCase()) || categorias[0]?.id;
          
          asignaciones.push({
            fecha_reporte: hoy,
            vendedor_id: vendedorId,
            cliente_id: clienteId,
            categoria_id: categoriaId,
            estado_activacion: mapEstadoActivacion(valor),
            ventas_recientes: 0,
            meta_activacion: mapEstadoActivacion(valor) === 'activado'
          });
        }
      });
    }

    console.log(`Asignaciones a insertar: ${asignaciones.length}`);

    // Insertar asignaciones en lotes
    let filasInsertadas = 0;
    if (asignaciones.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < asignaciones.length; i += batchSize) {
        const batch = asignaciones.slice(i, i + batchSize);
        const { error } = await supabaseAdmin.from('asignaciones').insert(batch);
        
        if (error) {
          console.error(`Error insertando lote ${i}-${i + batchSize}:`, error);
        } else {
          filasInsertadas += batch.length;
        }
      }
    }

    console.log(`✅ Proceso completado: ${filasInsertadas} registros insertados`);

    return new Response(JSON.stringify({
      success: true,
      message: `Importación completada. ${filasInsertadas} registros insertados de ${datos.length} filas procesadas.`,
      filas_procesadas: datos.length,
      filas_insertadas: filasInsertadas,
      debug_info: {
        vendedores_procesados: vendedoresMap.size,
        clientes_procesados: clientesMap.size,
        categorias_procesadas: categoriasExcel.length,
        asignaciones_insertadas: filasInsertadas,
        fecha_reporte: hoy
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