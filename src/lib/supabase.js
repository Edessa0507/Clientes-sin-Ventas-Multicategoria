import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ualdsvobfonbmsuhmtsr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhbGRzdm9iZm9uYm1zdWhtdHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTg4OTgsImV4cCI6MjA3MzM5NDg5OH0.gCP0Mz-p23PCHD9n5E1Ic8RCEkMLKEa7D6z8q6edUog'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Funciones de autenticación
export const auth = {
  // Login para vendedores y supervisores con código
  async loginWithCode(codigo, tipo) {
    try {
      let table = tipo === 'supervisor' ? 'supervisores' : 'vendedores'
      
      const { data: user, error } = await supabase
        .from(table)
        .select('*')
        .eq('codigo', codigo)
        .eq('activo', true)
        .single()

      if (error || !user) {
        throw new Error('Código no válido o usuario inactivo')
      }

      // Crear sesión personalizada
      const session = {
        user: {
          id: user.id,
          codigo: user.codigo,
          nombre: user.nombre_completo,
          tipo: tipo,
          zona_id: user.zona_id,
          supervisor_id: user.supervisor_id
        }
      }

      localStorage.setItem('session', JSON.stringify(session))
      return { data: session, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Login para administradores con email/password
  async loginAdmin(email, password) {
    try {
      // Usar función SQL para validar credenciales
      const { data, error } = await supabase
        .rpc('validate_admin_login', {
          email_input: email,
          password_input: password
        })

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('Credenciales inválidas')
      }

      const adminData = data[0]
      return {
        user: {
          id: adminData.id,
          email: adminData.email,
          nombre_completo: adminData.nombre_completo,
          tipo: 'admin'
        }
      }
    } catch (error) {
      console.error('Error en login admin:', error)
      throw error
    }
  },

  // Obtener sesión actual
  getSession() {
    const session = localStorage.getItem('session')
    return session ? JSON.parse(session) : null
  },

  // Cerrar sesión
  async logout() {
    localStorage.removeItem('session')
    await supabase.auth.signOut()
  },

  // Autocompletar nombre por código
  async getNameByCode(codigo, tipo) {
    try {
      let table = tipo === 'supervisor' ? 'supervisores' : 'vendedores'
      
      const { data, error } = await supabase
        .from(table)
        .select('nombre_completo')
        .eq('codigo', codigo)
        .eq('activo', true)
        .single()

      if (error || !data) return null
      return data.nombre_completo
    } catch (error) {
      return null
    }
  }
}

// Funciones para vendedores
export const vendedorService = {
  async getClientesByVendedor(vendedorId) {
    try {
      const { data, error } = await supabase
        .from('asignaciones')
        .select(`
          *,
          clientes (
            codigo,
            nombre
          )
        `)
        .eq('vendedor_id', vendedorId)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }
}

// Funciones para supervisores
export const supervisorService = {
  async getVendedoresBySupervisor(supervisorId) {
    try {
      const { data, error } = await supabase
        .from('vendedores')
        .select('*')
        .eq('supervisor_id', supervisorId)
        .eq('activo', true)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  async getAsignacionesBySupervisor(supervisorId, vendedorIds = null) {
    try {
      let query = supabase
        .from('asignaciones')
        .select(`
          *,
          vendedores (
            codigo,
            nombre_completo
          ),
          clientes (
            codigo,
            nombre
          )
        `)

      if (vendedorIds && vendedorIds.length > 0) {
        query = query.in('vendedor_id', vendedorIds)
      } else {
        // Obtener todos los vendedores del supervisor
        const { data: vendedores } = await supabase
          .from('vendedores')
          .select('id')
          .eq('supervisor_id', supervisorId)

        if (vendedores && vendedores.length > 0) {
          query = query.in('vendedor_id', vendedores.map(v => v.id))
        }
      }

      const { data, error } = await query

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }
}

// Funciones para administradores
export const adminService = {
  async getDashboardStats() {
    try {
      // Total supervisores
      const { count: totalSupervisores } = await supabase
        .from('supervisores')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true)

      // Total clientes
      const { count: totalClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true)

      // Última importación
      const { data: ultimaImportacion } = await supabase
        .from('importaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        data: {
          totalSupervisores,
          totalClientes,
          ultimaImportacion
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  async importExcelData(data, replaceMode = false, fechaInicio = null, fechaFin = null) {
    try {
      // Si es modo reemplazo, eliminar datos del rango de fechas
      if (replaceMode && fechaInicio && fechaFin) {
        await supabase
          .from('asignaciones')
          .delete()
          .gte('created_at', fechaInicio)
          .lte('created_at', fechaFin)
      }

      // Insertar nuevos datos
      const { data: result, error } = await supabase
        .from('asignaciones')
        .insert(data)

      if (error) throw error

      // Registrar la importación
      await supabase
        .from('importaciones')
        .insert({
          tipo: replaceMode ? 'reemplazo' : 'incremental',
          registros_procesados: data.length,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        })

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }
}
