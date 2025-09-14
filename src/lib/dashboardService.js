import { supabase } from './supabase.js'

// Servicio para calcular indicadores de dashboard según los requerimientos
export const dashboardService = {
  
  // 1. Cobertura básica - Clientes por Supervisor/Vendedor/Ruta
  async getCoberturaBasica(filtros = {}) {
    try {
      let query = supabase
        .from('asignaciones')
        .select('supervisor_codigo, supervisor_nombre, vendedor_codigo, vendedor_nombre, ruta_codigo, ruta_nombre, cliente_codigo')
      
      // Aplicar filtros según perfil
      if (filtros.supervisor_codigo) {
        query = query.eq('supervisor_codigo', filtros.supervisor_codigo)
      }
      if (filtros.vendedor_codigo) {
        query = query.eq('vendedor_codigo', filtros.vendedor_codigo)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Agrupar y contar clientes únicos
      const stats = {
        clientesPorSupervisor: {},
        clientesPorVendedor: {},
        clientesPorRuta: {}
      }
      
      const clientesUnicos = new Set()
      
      data.forEach(row => {
        clientesUnicos.add(row.cliente_codigo)
        
        // Por supervisor
        if (!stats.clientesPorSupervisor[row.supervisor_codigo]) {
          stats.clientesPorSupervisor[row.supervisor_codigo] = {
            nombre: row.supervisor_nombre,
            clientes: new Set()
          }
        }
        stats.clientesPorSupervisor[row.supervisor_codigo].clientes.add(row.cliente_codigo)
        
        // Por vendedor
        if (!stats.clientesPorVendedor[row.vendedor_codigo]) {
          stats.clientesPorVendedor[row.vendedor_codigo] = {
            nombre: row.vendedor_nombre,
            clientes: new Set()
          }
        }
        stats.clientesPorVendedor[row.vendedor_codigo].clientes.add(row.cliente_codigo)
        
        // Por ruta
        if (!stats.clientesPorRuta[row.ruta_codigo]) {
          stats.clientesPorRuta[row.ruta_codigo] = {
            nombre: row.ruta_nombre,
            clientes: new Set()
          }
        }
        stats.clientesPorRuta[row.ruta_codigo].clientes.add(row.cliente_codigo)
      })
      
      // Convertir Sets a números
      Object.keys(stats.clientesPorSupervisor).forEach(key => {
        stats.clientesPorSupervisor[key].total = stats.clientesPorSupervisor[key].clientes.size
        delete stats.clientesPorSupervisor[key].clientes
      })
      
      Object.keys(stats.clientesPorVendedor).forEach(key => {
        stats.clientesPorVendedor[key].total = stats.clientesPorVendedor[key].clientes.size
        delete stats.clientesPorVendedor[key].clientes
      })
      
      Object.keys(stats.clientesPorRuta).forEach(key => {
        stats.clientesPorRuta[key].total = stats.clientesPorRuta[key].clientes.size
        delete stats.clientesPorRuta[key].clientes
      })
      
      return {
        data: {
          totalClientes: clientesUnicos.size,
          ...stats
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // 2. Clientes totalmente activados (CONDICIONATE='Activado')
  async getClientesTotalmenteActivados(filtros = {}) {
    try {
      let query = supabase
        .from('asignaciones')
        .select('supervisor_codigo, vendedor_codigo, cliente_codigo, estado')
        .eq('categoria_codigo', 'ENSURE') // Usar una categoría como referencia
      
      if (filtros.supervisor_codigo) {
        query = query.eq('supervisor_codigo', filtros.supervisor_codigo)
      }
      if (filtros.vendedor_codigo) {
        query = query.eq('vendedor_codigo', filtros.vendedor_codigo)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Obtener datos de todas las categorías por cliente
      const clientesData = {}
      
      // Query para obtener todas las categorías de cada cliente
      let allCategoriesQuery = supabase
        .from('asignaciones')
        .select('cliente_codigo, categoria_codigo, estado')
      
      if (filtros.supervisor_codigo) {
        allCategoriesQuery = allCategoriesQuery.eq('supervisor_codigo', filtros.supervisor_codigo)
      }
      if (filtros.vendedor_codigo) {
        allCategoriesQuery = allCategoriesQuery.eq('vendedor_codigo', filtros.vendedor_codigo)
      }
      
      const { data: allData, error: allError } = await allCategoriesQuery
      
      if (allError) throw allError
      
      // Agrupar por cliente
      allData.forEach(row => {
        if (!clientesData[row.cliente_codigo]) {
          clientesData[row.cliente_codigo] = {}
        }
        clientesData[row.cliente_codigo][row.categoria_codigo] = row.estado
      })
      
      // Calcular clientes totalmente activados
      let totalClientes = 0
      let clientesActivados = 0
      
      Object.keys(clientesData).forEach(clienteCodigo => {
        const categorias = clientesData[clienteCodigo]
        const todasActivadas = ['ENSURE', 'CHOCOLATE', 'ALPINA', 'SUPER_DE_ALIM'].every(
          cat => categorias[cat] === 'Activado'
        )
        
        totalClientes++
        if (todasActivadas) clientesActivados++
      })
      
      const porcentaje = totalClientes > 0 ? (clientesActivados / totalClientes) * 100 : 0
      
      return {
        data: {
          totalClientes,
          clientesActivados,
          porcentaje: Math.round(porcentaje * 100) / 100
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // 3. Clientes con FALTA (al menos una categoría en 0)
  async getClientesConFalta(filtros = {}) {
    try {
      let query = supabase
        .from('asignaciones')
        .select('cliente_codigo, categoria_codigo, estado')
      
      if (filtros.supervisor_codigo) {
        query = query.eq('supervisor_codigo', filtros.supervisor_codigo)
      }
      if (filtros.vendedor_codigo) {
        query = query.eq('vendedor_codigo', filtros.vendedor_codigo)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Agrupar por cliente
      const clientesData = {}
      data.forEach(row => {
        if (!clientesData[row.cliente_codigo]) {
          clientesData[row.cliente_codigo] = {}
        }
        clientesData[row.cliente_codigo][row.categoria_codigo] = row.estado
      })
      
      // Calcular clientes con falta
      let totalClientes = 0
      let clientesConFalta = 0
      
      Object.keys(clientesData).forEach(clienteCodigo => {
        const categorias = clientesData[clienteCodigo]
        const tieneFalta = ['ENSURE', 'CHOCOLATE', 'ALPINA', 'SUPER_DE_ALIM'].some(
          cat => categorias[cat] === '0' || !categorias[cat]
        )
        
        totalClientes++
        if (tieneFalta) clientesConFalta++
      })
      
      const porcentaje = totalClientes > 0 ? (clientesConFalta / totalClientes) * 100 : 0
      
      return {
        data: {
          totalClientes,
          clientesConFalta,
          porcentaje: Math.round(porcentaje * 100) / 100
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // 4. Activación por categoría
  async getActivacionPorCategoria(filtros = {}) {
    try {
      let query = supabase
        .from('asignaciones')
        .select('categoria_codigo, estado')
      
      if (filtros.supervisor_codigo) {
        query = query.eq('supervisor_codigo', filtros.supervisor_codigo)
      }
      if (filtros.vendedor_codigo) {
        query = query.eq('vendedor_codigo', filtros.vendedor_codigo)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Calcular por categoría
      const stats = {}
      
      data.forEach(row => {
        if (!stats[row.categoria_codigo]) {
          stats[row.categoria_codigo] = { total: 0, activados: 0 }
        }
        stats[row.categoria_codigo].total++
        if (row.estado === 'Activado') {
          stats[row.categoria_codigo].activados++
        }
      })
      
      // Calcular porcentajes
      Object.keys(stats).forEach(categoria => {
        const { total, activados } = stats[categoria]
        stats[categoria].porcentaje = total > 0 ? Math.round((activados / total) * 10000) / 100 : 0
      })
      
      return { data: stats, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // 5. Intensidad de activación por cliente (promedio 0-4)
  async getIntensidadActivacion(filtros = {}) {
    try {
      let query = supabase
        .from('asignaciones')
        .select('cliente_codigo, categoria_codigo, estado')
      
      if (filtros.supervisor_codigo) {
        query = query.eq('supervisor_codigo', filtros.supervisor_codigo)
      }
      if (filtros.vendedor_codigo) {
        query = query.eq('vendedor_codigo', filtros.vendedor_codigo)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Agrupar por cliente
      const clientesData = {}
      data.forEach(row => {
        if (!clientesData[row.cliente_codigo]) {
          clientesData[row.cliente_codigo] = {}
        }
        clientesData[row.cliente_codigo][row.categoria_codigo] = row.estado
      })
      
      // Calcular intensidad
      let totalIntensidad = 0
      let totalClientes = 0
      
      Object.keys(clientesData).forEach(clienteCodigo => {
        const categorias = clientesData[clienteCodigo]
        let categoriasActivadas = 0
        
        ['ENSURE', 'CHOCOLATE', 'ALPINA', 'SUPER_DE_ALIM'].forEach(cat => {
          if (categorias[cat] === 'Activado') categoriasActivadas++
        })
        
        totalIntensidad += categoriasActivadas
        totalClientes++
      })
      
      const promedio = totalClientes > 0 ? totalIntensidad / totalClientes : 0
      
      return {
        data: {
          promedioCategoriasActivadas: Math.round(promedio * 100) / 100,
          totalClientes
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  },

  // Dashboard completo según perfil
  async getDashboardData(userSession) {
    try {
      const filtros = {}
      
      // Aplicar filtros según tipo de usuario
      if (userSession.user.tipo === 'supervisor') {
        filtros.supervisor_codigo = userSession.user.codigo
      } else if (userSession.user.tipo === 'vendedor') {
        filtros.vendedor_codigo = userSession.user.codigo
      }
      // Admin ve todo (sin filtros)
      
      const [
        cobertura,
        totalmenteActivados,
        conFalta,
        activacionCategoria,
        intensidad
      ] = await Promise.all([
        this.getCoberturaBasica(filtros),
        this.getClientesTotalmenteActivados(filtros),
        this.getClientesConFalta(filtros),
        this.getActivacionPorCategoria(filtros),
        this.getIntensidadActivacion(filtros)
      ])
      
      return {
        data: {
          cobertura: cobertura.data,
          totalmenteActivados: totalmenteActivados.data,
          conFalta: conFalta.data,
          activacionCategoria: activacionCategoria.data,
          intensidad: intensidad.data
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }
}
