import { createClient } from '@supabase/supabase-js'

// Configuración para GitHub Pages - usar valores hardcodeados para producción
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xaohatfpnsoszduxgdyp.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb2hhdGZwbnNvc3pkdXhnZHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTMxMzIsImV4cCI6MjA3Mjg2OTEzMn0.Sv3HsfTQ5X_o8EEpptwUsP1SCp1BdSHPe8qBomVJn3k'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Configuración optimizada de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'edessa-cliente-web/1.0.0',
      'apikey': supabaseAnonKey
    }
  }
})
