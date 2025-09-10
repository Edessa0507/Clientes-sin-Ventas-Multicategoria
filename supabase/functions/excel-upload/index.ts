/// <reference path="../types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req: Request): Promise<Response> => {
  console.log('=== IMPORTACION COMPLETA DE DATOS ===');
  
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
    console.log('Body recibido:', typeof body, Object.keys(body || {}));

    const { datos } = body;
    if (!Array.isArray(datos)) {
      return new Response(JSON.stringify({ success: false, error: 'Datos no es array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Datos: ${datos.length} filas`);

    // Crear cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xaohatfpnsoszduxgdyp.supabase.co';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI5MzEzMiwiZXhwIjoyMDcyODY5MTMyfQ._7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI';
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('Cliente Supabase creado');

    // Normalizador para extraer nombres después de prefijos
    const normalizeName = (value: unknown): string => {
      let str = (value ?? '').toString().trim();
      
      // Extraer nombre después de "CODIGO - "
      const match = str.match(/^[A-Z0-9\s-]+\s*-\s*(.+)$/);
      if (match) {
        str = match[1].trim();
      }
      
      return str.normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toUpperCase()
        .replace(/\s+/g, ' ');
    };

    // Extraer datos únicos del Excel
    const vendedoresUnicos = new Map<string, any>();
    const clientesUnicos = new Map<string, any>();

    datos.forEach(fila => {
      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);
      
      if (vendedorNorm) {
        vendedoresUnicos.set(vendedorNorm, {
          nombre_completo: vendedorNorm,
          codigo: fila.vendedor?.toString().split(' - ')[0] || vendedorNorm.substring(0, 10)
        });
      }
      
      if (clienteNorm) {
        clientesUnicos.set(clienteNorm, {
          nombre: clienteNorm,
          codigo: fila.cliente?.toString().split(' - ')[0] || clienteNorm.substring(0, 10)
        });
      }
    });

    console.log(`Vendedores únicos del Excel: ${vendedoresUnicos.size}`);
    console.log(`Clientes únicos del Excel: ${clientesUnicos.size}`);

    // Obtener zona y ruta por defecto
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

    // Obtener categoría por defecto
    const { data: primeraCategoria } = await supabaseAdmin
      .from('categorias')
      .select('id')
      .eq('activa', true)
      .limit(1)
      .single();

    console.log(`Zona: ${primeraZona?.id}, Ruta: ${primeraRuta?.id}, Categoría: ${primeraCategoria?.id}`);

    // Crear/actualizar vendedores
    const vendedorMap = new Map<string, string>();
    for (const [nombreNorm, datosVendedor] of vendedoresUnicos) {
      try {
        // Buscar si ya existe
        const { data: vendedorExistente } = await supabaseAdmin
          .from('vendedores')
          .select('id')
          .eq('nombre_completo', datosVendedor.nombre_completo)
          .single();

        if (vendedorExistente) {
          vendedorMap.set(nombreNorm, vendedorExistente.id);
          console.log(`Vendedor existente: ${datosVendedor.nombre_completo}`);
        } else {
          // Crear nuevo vendedor
          const { data: nuevoVendedor, error: errorVendedor } = await supabaseAdmin
            .from('vendedores')
            .insert({
              codigo: datosVendedor.codigo,
              nombre_completo: datosVendedor.nombre_completo,
              zona_id: primeraZona?.id,
              activo: true
            })
            .select('id')
            .single();

          if (!errorVendedor && nuevoVendedor) {
            vendedorMap.set(nombreNorm, nuevoVendedor.id);
            console.log(`Vendedor creado: ${datosVendedor.nombre_completo}`);
          }
        }
      } catch (e) {
        console.log(`Error con vendedor ${datosVendedor.nombre_completo}:`, e);
      }
    }

    // Crear/actualizar clientes
    const clienteMap = new Map<string, string>();
    for (const [nombreNorm, datosCliente] of clientesUnicos) {
      try {
        // Buscar si ya existe
        const { data: clienteExistente } = await supabaseAdmin
          .from('clientes')
          .select('id')
          .eq('nombre', datosCliente.nombre)
          .single();

        if (clienteExistente) {
          clienteMap.set(nombreNorm, clienteExistente.id);
          console.log(`Cliente existente: ${datosCliente.nombre}`);
        } else {
          // Crear nuevo cliente
          const { data: nuevoCliente, error: errorCliente } = await supabaseAdmin
            .from('clientes')
            .insert({
              codigo: datosCliente.codigo,
              nombre: datosCliente.nombre,
              zona_id: primeraZona?.id,
              ruta_id: primeraRuta?.id,
              activo: true
            })
            .select('id')
            .single();

          if (!errorCliente && nuevoCliente) {
            clienteMap.set(nombreNorm, nuevoCliente.id);
            console.log(`Cliente creado: ${datosCliente.nombre}`);
          }
        }
      } catch (e) {
        console.log(`Error con cliente ${datosCliente.nombre}:`, e);
      }
    }

    // Limpiar asignaciones del día
    const hoy = new Date().toISOString().split('T')[0];
    const { error: deleteError } = await supabaseAdmin
      .from('asignaciones')
      .delete()
      .eq('fecha_reporte', hoy);

    if (deleteError) {
      console.log('Error limpiando asignaciones:', deleteError);
    } else {
      console.log('Asignaciones del día limpiadas');
    }

    // Crear asignaciones
    const asignaciones: any[] = [];
    let errores: string[] = [];

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const vendedorNorm = normalizeName(fila.vendedor);
      const clienteNorm = normalizeName(fila.cliente);

      const vendedorId = vendedorMap.get(vendedorNorm);
      const clienteId = clienteMap.get(clienteNorm);

      if (!vendedorId || !clienteId) {
        errores.push(`Fila ${i + 1}: Vendedor o cliente no encontrado`);
        continue;
      }

      const asignacion = {
        vendedor_id: vendedorId,
        cliente_id: clienteId,
        categoria_id: primeraCategoria?.id,
        fecha_reporte: hoy,
        estado_activacion: 'pendiente'
      };

      // Agregar datos de productos si existen
      const ensure = Number(fila.ensure) || 0;
      const chocolate = Number(fila.chocolate) || 0;
      const alpina = Number(fila.alpina) || 0;
      const superDeAlim = Number(fila.super_de_alim) || 0;
      const condicionate = Number(fila.condicionate) || 0;

      if (ensure > 0) asignacion.ventas_recientes = ensure;
      if (chocolate > 0) asignacion.meta_activacion = true;

      asignaciones.push(asignacion);
    }

    console.log(`Asignaciones a insertar: ${asignaciones.length}`);

    // Insertar asignaciones
    let filasInsertadas = 0;
    if (asignaciones.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('asignaciones')
        .insert(asignaciones);
      
      if (insertError) {
        console.error('Error insertando asignaciones:', insertError);
        return new Response(JSON.stringify({ success: false, error: 'Error insertando asignaciones' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      filasInsertadas = asignaciones.length;
      console.log(`${filasInsertadas} asignaciones insertadas`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Importación completada. ${filasInsertadas} registros insertados de ${datos.length} procesados.`,
      filas_procesadas: datos.length,
      filas_insertadas: filasInsertadas,
      errores: errores,
      debug_info: {
        vendedores_creados: vendedorMap.size,
        clientes_creados: clienteMap.size,
        asignaciones_insertadas: filasInsertadas,
        errores_detallados: errores.slice(0, 5)
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