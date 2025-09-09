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

  // Verificar API Key: permitir anon o service role
  const authHeader = req.headers.get('Authorization') || '';
  const apiKeyFromAuth = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const apiKeyFromHeader = req.headers.get('apikey') || undefined;
  const providedApiKey = apiKeyFromAuth || apiKeyFromHeader;

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  console.log('Validando API Key...');
  console.log('Auth bearer presente:', !!apiKeyFromAuth);
  console.log('apikey header presente:', !!apiKeyFromHeader);
  console.log('Service Role Key en variables de entorno:', serviceRoleKey ? 'Presente' : 'Ausente');
  console.log('Anon Key en variables de entorno:', anonKey ? 'Presente' : 'Ausente');
  console.log('API Key proporcionada (primeros 10 chars):', providedApiKey ? providedApiKey.substring(0, 10) + '...' : 'Ninguna');

  // Validar que tenemos al menos una de las claves
  if (!serviceRoleKey && !anonKey) {
    console.error('Error de configuración: No hay claves de API configuradas');
    return handleError(new Error('Error de configuración del servidor'), 'validación de API Key');
  }

  // Validar la clave proporcionada
  const isValidKey = providedApiKey && (
    (serviceRoleKey && providedApiKey === serviceRoleKey) || 
    (anonKey && providedApiKey === anonKey)
  );

  if (!isValidKey) {
    console.error('Error de autenticación: API Key inválida o faltante');
    console.error('Clave esperada (service):', serviceRoleKey ? serviceRoleKey.substring(0, 10) + '...' : 'No configurada');
    console.error('Clave esperada (anon):', anonKey ? anonKey.substring(0, 10) + '...' : 'No configurada');
    return handleError(new Error('No autorizado: credenciales inválidas'), 'validación de API Key');
  }
  
  console.log('API Key validada correctamente');

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Error de configuración: Faltan variables de entorno');
      return handleError(new Error('Error de configuración del servidor'), 'creación del cliente Supabase');
    }
    
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
    const { data: user, error: userError } = await supabaseAdmin
      .from('auth_users')
      .select(`
        id,
        codigo,
        nombre_completo,
        rol,
        zona_id,
        supervisor_id,
        activo,
        ultimo_login
      `)
      .eq('codigo', normalizedCode)
      .eq('activo', true)
      .single()

    if (userError || !user) {
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
    if (!['vendedor', 'supervisor'].includes(user.rol)) {
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

    // Crear JWT personalizado con claims
    const payload = {
      sub: user.id,
      codigo: user.codigo,
      rol: user.rol,
      zona_id: user.zona_id,
      supervisor_id: user.supervisor_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 horas
    }

    // Firmar JWT (en producción usar una clave secreta robusta)
    const secret = Deno.env.get('JWT_SECRET') ?? 'your-secret-key'
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payloadB64 = btoa(JSON.stringify(payload))
    const data = encoder.encode(`${header}.${payloadB64}`)
    
    const signature = await crypto.subtle.sign('HMAC', key, data)
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    
    const token = `${header}.${payloadB64}.${signatureB64}`

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
        supervisor_id: user.supervisor_id
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
