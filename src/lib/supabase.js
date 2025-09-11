import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qhopombiwcfhmuvnugxg.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFob3BvbWJpd2NmaG11dm51Z3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDYwOTYsImV4cCI6MjA3MzE4MjA5Nn0.qubnee9QLZj3_qgFXtmcAuybgs212vrF6UW73M4vEGc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Funciones de autenticación
export const auth = {
  // Login para administradores con email/password
  async signInAdmin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Login para vendedores/supervisores con código
  async signInVendedor(codigo) {
    try {
      // Autenticar vendedor por código usando función SQL
      const { data, error } = await supabase
        .rpc('login_vendedor', { codigo });

      if (error) {
        return { data: null, error: error.message }
      }
      
      if (!data) {
        return { data: null, error: 'Código no válido o usuario inactivo' };
      }

      // Guardar datos del vendedor en el almacenamiento local
      localStorage.setItem('vendedor_data', JSON.stringify(data))
      localStorage.setItem('auth_type', 'vendedor')
      
      return { 
        data: { 
          user: { id: data.id, email: data.email }, 
          vendedor: data 
        }, 
        error: null 
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Obtener usuario actual
  async getCurrentUser() {
    const authType = localStorage.getItem('auth_type')
    const vendedorData = localStorage.getItem('vendedor_data')
    
    if (authType === 'vendedor' && vendedorData) {
      const vendedor = JSON.parse(vendedorData)
      return {
        user: { id: vendedor.id, email: vendedor.email },
        vendedor: vendedor
      }
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    return {
      user,
      vendedor: null
    }
  },

  // Cerrar sesión
  async signOut() {
    localStorage.removeItem('vendedor_data')
    localStorage.removeItem('auth_type')
    const { error } = await supabase.auth.signOut()
    return { error }
  }
}

// Funciones de datos
export const db = {
  supabase,
  // Obtener asignaciones por vendedor
  async getAsignacionesByVendedor(vendedorCodigo, fecha = null) {
    let query = supabase
      .from('asignaciones')
      .select(`
        *,
        clientes(cliente_nombre),
        categorias(categoria_nombre)
      `)
      .eq('vendedor_codigo', vendedorCodigo)

    if (fecha) {
      query = query.eq('fecha_reporte', fecha)
    }

    const { data, error } = await query.order('cliente_id')
    return { data, error }
  },

  // Obtener asignaciones por supervisor (zona/ruta)
  async getAsignacionesBySupervisor(zona, rutas = null, vendedorCodigo = null) {
    let query = supabase
      .from('asignaciones')
      .select(`
        *,
        clientes(cliente_nombre),
        categorias(categoria_nombre)
      `)
      .eq('zona', zona)

    if (rutas && rutas.length > 0) {
      query = query.in('ruta', rutas)
    }

    if (vendedorCodigo) {
      query = query.eq('vendedor_codigo', vendedorCodigo)
    }

    const { data, error } = await query.order('vendedor_codigo', { ascending: true })
    return { data, error }
  },

  // Obtener todos los vendedores
  async getVendedores() {
    const { data, error } = await supabase
      .from('auth_users')
      .select('*')
      .in('rol', ['vendedor', 'supervisor'])
      .order('nombre')
    
    return { data, error }
  },

  // Obtener categorías
  async getCategorias() {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('categoria_nombre')
    
    return { data, error }
  },

  // Obtener clientes
  async getClientes() {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('cliente_nombre')
    
    return { data, error }
  },

  // Reemplazar asignaciones por fecha (para importación)
  async replaceAsignacionesByFecha(fecha, asignaciones) {
    try {
      // Iniciar transacción eliminando datos existentes
      const { error: deleteError } = await supabase
        .from('asignaciones')
        .delete()
        .eq('fecha_reporte', fecha)

      if (deleteError) throw deleteError

      // Insertar nuevas asignaciones
      const { data, error: insertError } = await supabase
        .from('asignaciones')
        .insert(asignaciones)

      if (insertError) throw insertError

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Upsert categorías
  async upsertCategorias(categorias) {
    const { data, error } = await supabase
      .from('categorias')
      .upsert(categorias, { onConflict: 'categoria_nombre' })
    
    return { data, error }
  },

  // Upsert clientes
  async upsertClientes(clientes) {
    const { data, error } = await supabase
      .from('clientes')
      .upsert(clientes, { onConflict: 'cliente_id' })
    
    return { data, error }
  }
}
