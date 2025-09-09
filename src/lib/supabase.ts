import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Configuración global de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'edessa-cliente-web/1.0.0'
    }
  }
})

// Configuración para operaciones autenticadas
export const getAuthHeaders = () => ({
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'apikey': supabaseAnonKey,
  'Content-Type': 'application/json'
})
