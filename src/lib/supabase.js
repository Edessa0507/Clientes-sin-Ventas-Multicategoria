import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ualdsvobfonbmsuhmtsr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhbGRzdm9iZm9uYm1zdWhtdHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTg4OTgsImV4cCI6MjA3MzM5NDg5OH0.gCP0Mz-p23PCHD9n5E1Ic8RCEkMLKEa7D6z8q6edUog'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Funciones de autenticación
export const auth = {
  // Login con código para vendedores y email para supervisores
  async loginWithCode(codigo, tipo) {
    try {
      let table = tipo === 'supervisor' ? 'supervisores' : 'vendedores'
      let query = supabase.from(table).select('id, codigo, nombre_completo, email, activo').eq('activo', true)
      
      if (tipo === 'supervisor') {
        // Para supervisores: buscar por email exacto (case-insensitive)
        query = query.eq('email', codigo.toLowerCase())
      } else {
        // Para vendedores: buscar por código exacto (case-insensitive)
        query = query.eq('codigo', codigo.toUpperCase())
      }
      
      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        throw new Error(tipo === 'supervisor' ? 'Email no válido o supervisor inactivo' : 'Código no válido o vendedor inactivo')
      }

      // Crear sesión personalizada
      const session = {
        user: {
          id: data.id,
          codigo: data.codigo,
          email: data.email,
          nombre: data.nombre_completo,
          tipo: tipo
        }
      }

      localStorage.setItem('session', JSON.stringify(session))
      return { data: session, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Login de administrador
  async loginAdmin(email, password) {
    try {
      const { data, error } = await supabase.rpc('admin_login', {
        email_param: email.toLowerCase(), // Case-insensitive email
        password_param: password // Case-sensitive password
      })

      if (error || !data) {
        throw new Error('Credenciales inválidas')
      }

      const session = {
        user: {
          id: data.id,
          email: data.email,
          nombre: data.nombre_completo,
          tipo: 'admin'
        }
      }

      localStorage.setItem('session', JSON.stringify(session))
      return { data: session, error: null }
    } catch (error) {
      return { data: null, error: error.message }
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

  // Autocompletar nombre por código o email
  async getNameByCode(codigo, tipo) {
    try {
      let table = tipo === 'supervisor' ? 'supervisores' : 'vendedores'
      let query = supabase.from(table).select('nombre_completo').eq('activo', true)
      
      if (tipo === 'supervisor') {
        // Para supervisores: buscar por email exacto (case-insensitive)
        query = query.eq('email', codigo.toLowerCase())
      } else {
        // Para vendedores: buscar por código exacto (case-insensitive)
        query = query.eq('codigo', codigo.toUpperCase())
      }
      
      const { data, error } = await query.maybeSingle();

      if (error || !data) return null
      return data.nombre_completo
    } catch (error) {
      return null
    }
  }
}

// Función para obtener clientes por vendedor - SIMPLIFICADA
export const vendedorService = {
  async getClientesByVendedor(vendedorCodigo) {
    try {
      console.log('Buscando datos para vendedor:', vendedorCodigo)
      
      const { data, error } = await supabase
        .from('asignaciones')
        .select(`
          cliente_codigo,
          cliente_nombre,
          categoria_codigo,
          categoria_nombre,
          estado
        `)
        .eq('vendedor_codigo', vendedorCodigo)
      
      if (error) {
        console.error('Error en consulta:', error)
        throw error
      }
      
      console.log('Datos encontrados:', data?.length || 0, 'registros')
      return { data, error: null }
    } catch (error) {
      console.error('Error getting vendedor data:', error)
      return { data: null, error }
    }
  }
}

// Funciones para supervisores
export const supervisorService = {
  async getVendedoresBySupervisor(supervisorCodigo) {
    try {
      // Obtener vendedores únicos por supervisor (desnormalizado)
      const { data, error } = await supabase
        .from('asignaciones')
        .select('vendedor_codigo, vendedor_nombre')
        .eq('supervisor_codigo', supervisorCodigo)
        .not('vendedor_codigo', 'is', null)

      if (error) throw error
      
      // Eliminar duplicados
      const vendedoresUnicos = data.reduce((acc, curr) => {
        if (!acc.find(v => v.vendedor_codigo === curr.vendedor_codigo)) {
          acc.push(curr)
        }
        return acc
      }, [])
      
      return { data: vendedoresUnicos, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  async getAsignacionesBySupervisor(supervisorCodigo, vendedorCodigos = null) {
    try {
      let query = supabase
        .from('asignaciones')
        .select('*')
        .eq('supervisor_codigo', supervisorCodigo)

      if (vendedorCodigos && vendedorCodigos.length > 0) {
        query = query.in('vendedor_codigo', vendedorCodigos)
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
      // Total supervisores desde asignaciones
      const { data: supervisores } = await supabase
        .from('asignaciones')
        .select('supervisor_codigo')
        .not('supervisor_codigo', 'is', null)
      
      const totalSupervisores = new Set(supervisores?.map(s => s.supervisor_codigo) || []).size

      // Total clientes desde asignaciones
      const { data: clientes } = await supabase
        .from('asignaciones')
        .select('cliente_codigo')
        .not('cliente_codigo', 'is', null)
      
      const totalClientes = new Set(clientes?.map(c => c.cliente_codigo) || []).size

      // Última importación
      const { data: ultimaImportacion } = await supabase
        .from('importaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

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
