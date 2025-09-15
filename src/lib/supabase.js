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
          estado,
          ruta_codigo,
          ruta_nombre
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

// Funciones para supervisores - SIMPLIFICADAS
export const supervisorService = {
  async getVendedoresBySupervisor(supervisorCodigo) {
    try {
      console.log('Buscando vendedores para supervisor:', supervisorCodigo)
      
      // Obtener vendedores únicos por supervisor (desnormalizado)
      const { data, error } = await supabase
        .from('asignaciones')
        .select('vendedor_codigo, vendedor_nombre, ruta_codigo, ruta_nombre')
        .eq('supervisor_codigo', supervisorCodigo)
      
      if (error) {
        console.error('Error en consulta vendedores:', error)
        throw error
      }
      
      // Eliminar duplicados y formatear
      const vendedoresUnicos = data.reduce((acc, item) => {
        const key = item.vendedor_codigo
        if (!acc[key]) {
          acc[key] = {
            codigo: item.vendedor_codigo,
            nombre_completo: item.vendedor_nombre
          }
        }
        return acc
      }, {})
      
      const vendedores = Object.values(vendedoresUnicos)
      console.log('Vendedores encontrados:', vendedores.length)
      return { data: vendedores, error: null }
    } catch (error) {
      console.error('Error getting vendedores by supervisor:', error)
      return { data: [], error }
    }
  },

  async getAsignacionesBySupervisor(supervisorCodigo) {
    try {
      console.log('Buscando asignaciones para supervisor:', supervisorCodigo)
      
      const { data, error } = await supabase
        .from('asignaciones')
        .select(`
          vendedor_codigo,
          vendedor_nombre,
          cliente_codigo,
          cliente_nombre,
          categoria_codigo,
          categoria_nombre,
          estado,
          ruta_codigo,
          ruta_nombre
        `)
        .eq('supervisor_codigo', supervisorCodigo)
      
      if (error) {
        console.error('Error en consulta asignaciones:', error)
        throw error
      }
      
      console.log('Asignaciones encontradas:', data?.length || 0)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error getting asignaciones by supervisor:', error)
      return { data: [], error }
    }
  }
}

// Funciones para administradores - SIMPLIFICADAS
export const adminService = {
  async getDashboardStats() {
    try {
      console.log('Cargando estadísticas del dashboard admin...')
      
      // Total supervisores desde asignaciones
      const { data: supervisores, error: errorSup } = await supabase
        .from('asignaciones')
        .select('supervisor_codigo')
        .not('supervisor_codigo', 'is', null)
      
      if (errorSup) {
        console.error('Error cargando supervisores:', errorSup)
        throw errorSup
      }
      
      const uniqueSupervisores = new Set(supervisores?.map(s => s.supervisor_codigo) || [])
      
      // Total clientes desde asignaciones
      const { data: clientes, error: errorCli } = await supabase
        .from('asignaciones')
        .select('cliente_codigo')
        .not('cliente_codigo', 'is', null)
      
      if (errorCli) {
        console.error('Error cargando clientes:', errorCli)
        throw errorCli
      }
      
      const uniqueClientes = new Set(clientes?.map(c => c.cliente_codigo) || [])
      
      // Total vendedores desde asignaciones
      const { data: vendedores, error: errorVen } = await supabase
        .from('asignaciones')
        .select('vendedor_codigo')
        .not('vendedor_codigo', 'is', null)
      
      if (errorVen) {
        console.error('Error cargando vendedores:', errorVen)
        throw errorVen
      }
      
      const uniqueVendedores = new Set(vendedores?.map(v => v.vendedor_codigo) || [])
      
      // Última importación (aproximada por fecha más reciente)
      const { data: ultimaImportacion } = await supabase
        .from('asignaciones')
        .select('fecha, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
      
      // Obtener datos recientes para mostrar en dashboard (limitado a 15)
      const { data: recentData } = await supabase
        .from('asignaciones')
        .select('cliente_nombre, vendedor_nombre, ruta_nombre, categoria_nombre')
        .order('created_at', { ascending: false })
        .limit(15)
      
      const stats = {
        totalSupervisores: uniqueSupervisores.size,
        totalVendedores: uniqueVendedores.size,
        totalClientes: uniqueClientes.size,
        ultimaImportacion: (ultimaImportacion && ultimaImportacion.length > 0) ? ultimaImportacion[0] : null,
        recentData: recentData || []
      }
      
      console.log('Estadísticas cargadas:', stats)
      
      return { data: stats, error: null }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return { data: null, error }
    }
  },

  async importExcelData(data, replaceMode = false, fechaInicio = null, fechaFin = null) {
    try {
      // Si es modo reemplazo, eliminar datos del rango de fechas
      if (replaceMode && fechaInicio && fechaFin) {
        console.log('Eliminando datos existentes del rango:', fechaInicio, 'a', fechaFin)
        const deleteResult = await supabase
          .from('asignaciones')
          .delete()
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin)
        
        console.log('Resultado de eliminación:', deleteResult)
        
        if (deleteResult.error) {
          console.error('Error eliminando datos:', deleteResult.error)
          throw deleteResult.error
        }
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

      // Esta función no debe manejar estado de dashboard directamente
      // El estado debe ser manejado por el componente que llama a esta función 

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }
}
