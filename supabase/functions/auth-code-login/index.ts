/// <reference path="../types.d.ts" />
// @deno-types="https://deno.land/x/types/deno.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

interface LoginRequest {
  code: string
  captcha?: string
}

interface LoginResponse {
  success: boolean
  token?: string
  user?: {
    id: string
    codigo: string
    nombre: string
    rol: string
    zona_id?: string
    supervisor_id?: string
    email?: string
    ultimo_login?: string
    created_at?: string
  }
  error?: string
}

// Definir tipos para el entorno de Deno
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// (Tipos no utilizados eliminados para evitar errores de compilación)

serve(async (req: Request): Promise<Response> => {
  console.log('=== Inicio de solicitud a auth-code-login ===');
  console.log('Método:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

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
      
      // Mapear errores comunes a códigos de estado apropiados
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
        'Access-Control-Max-Age': '86400'  // Cache preflight por 24 horas
      } 
    });
  }

  // Solo permitir método POST
  if (req.method !== 'POST') {
    return handleError(new Error('Método no permitido'), 'validación de método HTTP');
  }

  // Log de headers para debug
  console.log('Headers recibidos:', Object.fromEntries(req.headers.entries()));

  try {
    console.log('Procesando solicitud de autenticación...');
    
    // Parsear el cuerpo de la solicitud
    let body;
    try {
      body = await req.json();
      console.log('Cuerpo de la solicitud:', body);
    } catch (e) {
      return handleError(e, 'análisis del cuerpo de la solicitud');
    }

    // Validar código requerido
    const { code, captcha }: LoginRequest = body;
    
    console.log('Validando código de autenticación...');
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      console.error('Código de autenticación inválido:', code);
      return handleError(new Error('Código de autenticación requerido'), 'validación de código');
    }

    // Normalizar código (trim y mayúsculas)
    const normalizedCode = code.trim().toUpperCase();
    console.log('Código normalizado:', normalizedCode);
    
    // Crear cliente Supabase con service role
    console.log('Creando cliente Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xaohatfpnsoszduxgdyp.supabase.co';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI5MzEzMiwiZXhwIjoyMDcyODY5MTMyfQ._7UR1-L1Jx4YQz-bgp9u_vU-7UHqimt_ErakI9av6cI';
    
    console.log('SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'OK' : 'MISSING');
    
    // Crear cliente Supabase con service role
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

    // Buscar usuario por código
    let { data: user, error: userError } = await supabaseAdmin
      .from('auth_users')
      .select(`
        id,
        codigo,
        nombre_completo,
        rol,
        zona_id,
        supervisor_id,
        activo,
        ultimo_login,
        email,
        created_at
      `)
      .eq('codigo', normalizedCode)
      .eq('activo', true)
      .single()

    // Si el usuario no existe y es el administrador, crearlo
    if ((userError || !user) && normalizedCode === 'ADMIN001') {
      console.log('Creando usuario administrador...')
      
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('auth_users')
        .insert({
          codigo: 'ADMIN001',
          email: 'gustavo.reyes@edessa.do',
          nombre_completo: 'GUSTAVO REYES',
          rol: 'admin',
          zona_id: null,
          supervisor_id: null,
          activo: true
        })
        .select(`
          id,
          codigo,
          nombre_completo,
          rol,
          zona_id,
          supervisor_id,
          activo,
          ultimo_login,
          email,
          created_at
        `)
        .single()

      if (createError) {
        console.error('Error al crear usuario administrador:', createError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error al crear usuario administrador' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      user = newUser
      console.log('Usuario administrador creado exitosamente')
    } else if (userError || !user) {
      // Log intento fallido (sin exponer información sensible)
      console.log(`Login fallido para código: ${normalizedCode}`)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Código de vendedor no válido o inactivo' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar que el rol permite login por código
    if (!['vendedor', 'supervisor', 'admin'].includes(user.rol)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tipo de usuario no autorizado para login por código' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generar token simple para la sesión
    const token = `edessa_${user.id}_${Date.now()}`

    // Actualizar último login
    await supabaseAdmin
      .from('auth_users')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', user.id)

    // Log login exitoso
    console.log(`Login exitoso para código: ${normalizedCode}, rol: ${user.rol}`)

    // Respuesta exitosa
    const response: LoginResponse = {
      success: true,
      token,
      user: {
        id: user.id,
        codigo: user.codigo,
        nombre: user.nombre_completo,
        rol: user.rol,
        zona_id: user.zona_id,
        supervisor_id: user.supervisor_id,
        email: user.email,
        ultimo_login: user.ultimo_login,
        created_at: user.created_at
      }
    }

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
    return handleError(error, 'manejo de solicitud de autenticación');
  }
});
