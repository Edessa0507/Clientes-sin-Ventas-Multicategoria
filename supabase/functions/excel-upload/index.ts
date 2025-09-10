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

    // Solo devolver éxito sin procesar nada
    return new Response(JSON.stringify({
      success: true,
      message: `Recibido correctamente. ${datos.length} filas.`,
      filas_procesadas: datos.length,
      filas_insertadas: 0,
      debug_info: {
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