/// <reference path="../types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req: Request): Promise<Response> => {
  console.log('=== FUNCION SIMPLE ===');
  
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
    console.log('Primera fila:', datos[0]);

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
      console.error('Error vendedores:', errorVendedores);
      return new Response(JSON.stringify({ success: false, error: 'Error obteniendo vendedores' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Obtener clientes
    const { data: clientes, error: errorClientes } = await supabaseAdmin
      .from('clientes')
      .select('id, codigo, nombre');
    
    if (errorClientes) {
      console.error('Error clientes:', errorClientes);
      return new Response(JSON.stringify({ success: false, error: 'Error obteniendo clientes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Obtener categorías
    const { data: categorias, error: errorCategorias } = await supabaseAdmin
      .from('categorias')
      .select('id, codigo, nombre');
    
    if (errorCategorias) {
      console.error('Error categorías:', errorCategorias);
      return new Response(JSON.stringify({ success: false, error: 'Error obteniendo categorías' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Vendedores: ${vendedores?.length || 0}`);
    console.log(`Clientes: ${clientes?.length || 0}`);
    console.log(`Categorías: ${categorias?.length || 0}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Datos obtenidos correctamente. ${datos.length} filas procesadas.`,
      filas_procesadas: datos.length,
      filas_insertadas: 0,
      debug_info: {
        vendedores_encontrados: vendedores?.length || 0,
        clientes_encontrados: clientes?.length || 0,
        categorias_encontradas: categorias?.length || 0,
        primera_fila: datos[0],
        total_filas: datos.length
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