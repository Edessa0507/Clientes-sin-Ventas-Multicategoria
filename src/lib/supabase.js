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

  // Login de administrador - SOLO gustavo.reyes@edessa.do
  async loginAdmin(email, password) {
    try {
      // Validación estricta: SOLO el usuario autorizado
      const ADMIN_EMAIL = 'gustavo.reyes@edessa.do'
      const ADMIN_PASSWORD = 'EdessA2748'
      
      if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        throw new Error('Usuario no autorizado')
      }
      
      if (password !== ADMIN_PASSWORD) {
        throw new Error('Contraseña incorrecta')
      }

      // Crear sesión solo para el usuario autorizado
      const session = {
        user: {
          id: 1,
          email: ADMIN_EMAIL,
          nombre: 'Gustavo Reyes',
          tipo: 'admin'
        }
      }

      localStorage.setItem('session', JSON.stringify(session))
      return { data: session, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  async loginSupervisor(codigo) {
    try {
      // Mapear códigos conocidos para compatibilidad
      const supervisorMap = {
        'CVALDEZ': 'CARLOS',
        'CARLOS': 'CARLOS',
        'ISMAEL': 'ISMAEL', 
        'SEVERO': 'SEVERO'
      }
      
      const mappedCode = supervisorMap[codigo.toUpperCase()] || codigo.toUpperCase()
      
      // Buscar supervisor por código mapeado
      const result = await this.getVendedoresBySupervisor(mappedCode)
      
      if (result.data && result.data.length > 0) {
        const supervisor = result.data[0]
        const session = {
          user: {
            codigo: supervisor.supervisor_codigo,
            nombre: supervisor.supervisor_nombre,
            tipo: 'supervisor'
          }
        }
        localStorage.setItem('session', JSON.stringify(session))
        return { data: session, error: null }
      } else {
        throw new Error('Supervisor no encontrado')
      }
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
      if (tipo === 'supervisor') {
        // Mapear códigos conocidos para supervisores
        const supervisorMap = {
          'CVALDEZ': 'CARLOS',
          'CARLOS': 'CARLOS',
          'ISMAEL': 'ISMAEL', 
          'SEVERO': 'SEVERO'
        }
        
        const mappedCode = supervisorMap[codigo.toUpperCase()] || codigo.toUpperCase()
        
        // Buscar en asignaciones para obtener el nombre
        const { data, error } = await supabase
          .from('asignaciones')
          .select('supervisor_nombre')
          .eq('supervisor_codigo', mappedCode)
          .limit(1)
          .maybeSingle()
        
        if (error || !data) {
          return { success: false, data: null }
        }
        
        return { success: true, data: data.supervisor_nombre }
      } else {
        // Para vendedores: buscar en asignaciones
        const { data, error } = await supabase
          .from('asignaciones')
          .select('vendedor_nombre')
          .eq('vendedor_codigo', codigo.toUpperCase())
          .limit(1)
          .maybeSingle()
        
        if (error || !data) {
          return { success: false, data: null }
        }
        
        return { success: true, data: data.vendedor_nombre }
      }
    } catch (error) {
      return { success: false, data: null }
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
      
      // Usar función SQL para búsqueda flexible
      const { data, error } = await supabase
        .rpc('obtener_vendedores_supervisor', { 
          codigo_busqueda: supervisorCodigo 
        })
      
      if (error) {
        console.error('Error en RPC obtener_vendedores_supervisor:', error)
        // Fallback a búsqueda manual si la función no existe
        return await this.getVendedoresBySupervisorFallback(supervisorCodigo)
      }
      
      console.log('Vendedores encontrados:', data?.length || 0)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error getting vendedores by supervisor:', error)
      // Fallback a búsqueda manual
      return await this.getVendedoresBySupervisorFallback(supervisorCodigo)
    }
  },

  async getVendedoresBySupervisorFallback(supervisorCodigo) {
    try {
      console.log('Usando fallback para supervisor:', supervisorCodigo)
      
      // Búsqueda más flexible con múltiples criterios
      const { data, error } = await supabase
        .from('asignaciones')
        .select(`
          vendedor_codigo,
          vendedor_nombre,
          supervisor_codigo,
          supervisor_nombre
        `)
        .or(`supervisor_codigo.ilike.%${supervisorCodigo}%,supervisor_nombre.ilike.%${supervisorCodigo}%`)
      
      if (error) throw error
      
      // Eliminar duplicados por vendedor_codigo
      const vendedoresUnicos = []
      const seen = new Set()
      
      data?.forEach(item => {
        if (!seen.has(item.vendedor_codigo)) {
          seen.add(item.vendedor_codigo)
          vendedoresUnicos.push(item)
        }
      })
      
      console.log('Vendedores encontrados (fallback):', vendedoresUnicos.length)
      return { data: vendedoresUnicos, error: null }
    } catch (error) {
      console.error('Error in fallback search:', error)
      return { data: [], error }
    }
  },

  async getAsignacionesBySupervisor(supervisorCodigo) {
    try {
      console.log('Buscando asignaciones para supervisor:', supervisorCodigo)
      
      // Búsqueda más flexible con múltiples criterios
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
          ruta_nombre,
          supervisor_codigo,
          supervisor_nombre
        `)
        .or(`supervisor_codigo.ilike.%${supervisorCodigo}%,supervisor_nombre.ilike.%${supervisorCodigo}%`)
      
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

// Funciones para gestión de rutas
export const rutasService = {
  // Obtener todas las rutas
  async getAllRutas() {
    try {
      const { data, error } = await supabase
        .from('rutas')
        .select('*')
        .eq('activa', true)
        .order('nombre')

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error getting rutas:', error)
      return { data: [], error: error.message }
    }
  },

  // Obtener rutas desde asignaciones (datos desnormalizados)
  async getRutasFromAsignaciones() {
    try {
      const { data, error } = await supabase
        .from('asignaciones')
        .select('ruta_codigo, ruta_nombre')
        .not('ruta_codigo', 'is', null)
        .not('ruta_nombre', 'is', null)

      if (error) throw error

      // Eliminar duplicados
      const rutasUnicas = []
      const seen = new Set()
      
      data?.forEach(item => {
        const key = `${item.ruta_codigo}-${item.ruta_nombre}`
        if (!seen.has(key)) {
          seen.add(key)
          rutasUnicas.push({
            codigo: item.ruta_codigo,
            nombre: item.ruta_nombre,
            activa: true
          })
        }
      })

      return { data: rutasUnicas, error: null }
    } catch (error) {
      console.error('Error getting rutas from asignaciones:', error)
      return { data: [], error: error.message }
    }
  },

  // Sincronizar rutas desde asignaciones a tabla rutas
  async syncRutasFromAsignaciones() {
    try {
      // Usar función SQL si está disponible
      const { data, error } = await supabase
        .rpc('sync_rutas_from_asignaciones')
      
      if (error) {
        console.error('Error en RPC sync_rutas_from_asignaciones:', error)
        // Fallback a sincronización manual
        return await this.syncRutasFromAsignacionesFallback()
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Error syncing rutas:', error)
      return await this.syncRutasFromAsignacionesFallback()
    }
  },

  async syncRutasFromAsignacionesFallback() {
    try {
      // Obtener rutas únicas desde asignaciones
      const { data: rutasFromAsignaciones } = await this.getRutasFromAsignaciones()
      
      if (!rutasFromAsignaciones || rutasFromAsignaciones.length === 0) {
        return { data: [], error: 'No hay rutas en asignaciones para sincronizar' }
      }

      // Obtener rutas existentes en tabla rutas
      const { data: rutasExistentes } = await this.getAllRutas()
      const codigosExistentes = new Set(rutasExistentes?.map(r => r.codigo) || [])

      // Insertar rutas nuevas
      const rutasNuevas = rutasFromAsignaciones.filter(ruta => 
        !codigosExistentes.has(ruta.codigo)
      )

      if (rutasNuevas.length > 0) {
        const { data, error } = await supabase
          .from('rutas')
          .insert(rutasNuevas.map(ruta => ({
            codigo: ruta.codigo,
            nombre: ruta.nombre,
            descripcion: `Ruta ${ruta.nombre}`,
            activa: true
          })))
          .select()

        if (error) throw error

        return { data: data || [], error: null }
      }

      return { data: [], error: null }
    } catch (error) {
      console.error('Error syncing rutas:', error)
      return { data: [], error: error.message }
    }
  },

  // Diagnosticar problemas con rutas
  async diagnosticRutas() {
    try {
      const results = {}

      // 1. Verificar si tabla rutas existe
      const { data: tablaRutas, error: errorTabla } = await supabase
        .from('rutas')
        .select('count(*)')
        .limit(1)

      results.tablaRutasExiste = !errorTabla
      results.errorTabla = errorTabla?.message

      // 2. Contar rutas en tabla rutas
      if (results.tablaRutasExiste) {
        const { data: countRutas } = await supabase
          .from('rutas')
          .select('*', { count: 'exact' })

        results.totalRutasEnTabla = countRutas?.length || 0
      }

      // 3. Contar rutas únicas en asignaciones
      const { data: rutasAsignaciones } = await this.getRutasFromAsignaciones()
      results.totalRutasEnAsignaciones = rutasAsignaciones?.length || 0

      // 4. Verificar asignaciones sin ruta
      const { data: sinRuta, error: errorSinRuta } = await supabase
        .from('asignaciones')
        .select('count(*)')
        .or('ruta_codigo.is.null,ruta_nombre.is.null')

      results.asignacionesSinRuta = sinRuta?.[0]?.count || 0

      // 5. Muestra de rutas en asignaciones
      const { data: muestraRutas } = await supabase
        .from('asignaciones')
        .select('ruta_codigo, ruta_nombre')
        .not('ruta_codigo', 'is', null)
        .limit(5)

      results.muestraRutas = muestraRutas || []

      return { data: results, error: null }
    } catch (error) {
      console.error('Error in diagnostic:', error)
      return { data: null, error: error.message }
    }
  }
}

// Funciones para gestión de usuarios
export const userManagementService = {
  // Obtener todos los usuarios del sistema
  async getAllUsers() {
    try {
      // Obtener vendedores
      const { data: vendedores, error: errorVendedores } = await supabase
        .from('vendedores')
        .select('id, codigo, nombre_completo, email, activo, created_at')
        .order('nombre_completo')

      if (errorVendedores) throw errorVendedores

      // Obtener supervisores
      const { data: supervisores, error: errorSupervisores } = await supabase
        .from('supervisores')
        .select('id, codigo, nombre_completo, email, activo, created_at')
        .order('nombre_completo')

      if (errorSupervisores) throw errorSupervisores

      // Combinar y formatear usuarios
      const usuarios = [
        ...vendedores.map(v => ({ ...v, tipo: 'vendedor' })),
        ...supervisores.map(s => ({ ...s, tipo: 'supervisor' })),
        // Agregar admin hardcodeado
        {
          id: 'admin-1',
          codigo: 'ADMIN',
          nombre_completo: 'Gustavo Reyes',
          email: 'gustavo.reyes@edessa.do',
          tipo: 'admin',
          activo: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      return { data: usuarios, error: null }
    } catch (error) {
      console.error('Error getting users:', error)
      return { data: [], error: error.message }
    }
  },

  // Crear nuevo usuario
  async createUser(userData) {
    try {
      const { codigo, nombre_completo, email, tipo } = userData
      
      if (tipo === 'admin') {
        throw new Error('No se pueden crear administradores adicionales')
      }

      const table = tipo === 'supervisor' ? 'supervisores' : 'vendedores'
      
      const { data, error } = await supabase
        .from(table)
        .insert({
          codigo: codigo.toUpperCase(),
          nombre_completo,
          email: email.toLowerCase(),
          activo: true
        })
        .select()
        .single()

      if (error) throw error

      return { data: { ...data, tipo }, error: null }
    } catch (error) {
      console.error('Error creating user:', error)
      return { data: null, error: error.message }
    }
  },

  // Actualizar usuario
  async updateUser(userId, userData) {
    try {
      const { tipo, ...updateData } = userData
      
      if (tipo === 'admin') {
        throw new Error('No se puede modificar el administrador')
      }

      const table = tipo === 'supervisor' ? 'supervisores' : 'vendedores'
      
      const { data, error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      return { data: { ...data, tipo }, error: null }
    } catch (error) {
      console.error('Error updating user:', error)
      return { data: null, error: error.message }
    }
  },

  // Cambiar estado activo/inactivo
  async toggleUserStatus(userId, tipo, newStatus) {
    try {
      if (tipo === 'admin') {
        throw new Error('No se puede desactivar el administrador')
      }

      const table = tipo === 'supervisor' ? 'supervisores' : 'vendedores'
      
      const { data, error } = await supabase
        .from(table)
        .update({ activo: newStatus })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      return { data: { ...data, tipo }, error: null }
    } catch (error) {
      console.error('Error toggling user status:', error)
      return { data: null, error: error.message }
    }
  },

  // Eliminar usuario
  async deleteUser(userId, tipo) {
    try {
      if (tipo === 'admin') {
        throw new Error('No se puede eliminar el administrador')
      }

      const table = tipo === 'supervisor' ? 'supervisores' : 'vendedores'
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', userId)

      if (error) throw error

      return { data: true, error: null }
    } catch (error) {
      console.error('Error deleting user:', error)
      return { data: false, error: error.message }
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
      
      // Calcular datos para gráficos desde datos reales
      const { data: activacionesPorRuta } = await supabase
        .from('asignaciones')
        .select('ruta_nombre, estado')
        .not('ruta_nombre', 'is', null)
      
      // Procesar activaciones por ruta
      const rutasMap = new Map()
      activacionesPorRuta?.forEach(asignacion => {
        const ruta = asignacion.ruta_nombre
        if (!rutasMap.has(ruta)) {
          rutasMap.set(ruta, { total: 0, activadas: 0 })
        }
        const rutaData = rutasMap.get(ruta)
        rutaData.total++
        if (asignacion.estado === 'Activado') {
          rutaData.activadas++
        }
      })
      
      const chartData = Array.from(rutasMap.entries()).map(([ruta, data]) => ({
        zona: ruta,
        activacion: data.total > 0 ? Math.round((data.activadas / data.total) * 100) : 0
      }))
      
      // Calcular activaciones por categoría
      const { data: activacionesPorCategoria } = await supabase
        .from('asignaciones')
        .select('categoria_nombre, estado')
        .not('categoria_nombre', 'is', null)
      
      const categoriasMap = new Map()
      activacionesPorCategoria?.forEach(asignacion => {
        const categoria = asignacion.categoria_nombre
        if (!categoriasMap.has(categoria)) {
          categoriasMap.set(categoria, { total: 0, activadas: 0 })
        }
        const catData = categoriasMap.get(categoria)
        catData.total++
        if (asignacion.estado === 'Activado') {
          catData.activadas++
        }
      })
      
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
      const pieData = Array.from(categoriasMap.entries()).map(([categoria, data], index) => ({
        name: categoria,
        value: data.total > 0 ? Math.round((data.activadas / data.total) * 100) : 0,
        color: colors[index % colors.length]
      }))

      const stats = {
        totalSupervisores: uniqueSupervisores.size,
        totalVendedores: uniqueVendedores.size,
        totalClientes: uniqueClientes.size,
        ultimaImportacion: (ultimaImportacion && ultimaImportacion.length > 0) ? ultimaImportacion[0] : null,
        recentData: recentData || [],
        chartData: chartData,
        pieData: pieData
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
