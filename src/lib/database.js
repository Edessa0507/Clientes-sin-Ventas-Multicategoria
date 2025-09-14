import Dexie from 'dexie'

// Base de datos IndexedDB para funcionalidad offline
export class AppDatabase extends Dexie {
  constructor() {
    super('ClientesAppDB')
    
    this.version(1).stores({
      clientes: '++id, codigo, nombre, zona_id, ruta_id, activo, sync_status',
      categorias: '++id, codigo, nombre, activa, sync_status',
      asignaciones: '++id, cliente_id, categoria_id, vendedor_id, estado, fecha, sync_status',
      vendedores: '++id, codigo, nombre_completo, zona_id, supervisor_id, activo, sync_status',
      supervisores: '++id, codigo, nombre_completo, zona_id, activo, sync_status',
      cache_metadata: '++id, key, value, timestamp'
    })
  }
}

export const db = new AppDatabase()

// Funciones de cache offline
export const offlineCache = {
  // Guardar datos de vendedor en cache
  async cacheVendedorData(vendedorId, data) {
    try {
      await db.transaction('rw', [db.asignaciones, db.clientes, db.categorias], async () => {
        // Limpiar datos anteriores del vendedor
        await db.asignaciones.where('vendedor_id').equals(vendedorId).delete()
        
        // Guardar nuevas asignaciones
        if (data.asignaciones) {
          await db.asignaciones.bulkAdd(data.asignaciones.map(item => ({
            ...item,
            sync_status: 'synced'
          })))
        }
        
        // Guardar clientes
        if (data.clientes) {
          await db.clientes.bulkPut(data.clientes.map(item => ({
            ...item,
            sync_status: 'synced'
          })))
        }
        
        // Guardar categorías
        if (data.categorias) {
          await db.categorias.bulkPut(data.categorias.map(item => ({
            ...item,
            sync_status: 'synced'
          })))
        }
      })
      
      // Actualizar timestamp del cache
      await this.updateCacheTimestamp(`vendedor_${vendedorId}`)
    } catch (error) {
      console.error('Error caching vendedor data:', error)
    }
  },

  // Obtener datos de vendedor desde cache
  async getCachedVendedorData(vendedorId) {
    try {
      const asignaciones = await db.asignaciones
        .where('vendedor_id')
        .equals(vendedorId)
        .toArray()
      
      const clienteIds = [...new Set(asignaciones.map(a => a.cliente_id))]
      const clientes = await db.clientes
        .where('id')
        .anyOf(clienteIds)
        .toArray()
      
      const categoriaIds = [...new Set(asignaciones.map(a => a.categoria_id))]
      const categorias = await db.categorias
        .where('id')
        .anyOf(categoriaIds)
        .toArray()
      
      return {
        asignaciones,
        clientes,
        categorias,
        timestamp: await this.getCacheTimestamp(`vendedor_${vendedorId}`)
      }
    } catch (error) {
      console.error('Error getting cached vendedor data:', error)
      return null
    }
  },

  // Guardar datos de supervisor en cache
  async cacheSupervisorData(supervisorId, data) {
    try {
      await db.transaction('rw', [db.vendedores, db.asignaciones, db.clientes], async () => {
        // Guardar vendedores del supervisor
        if (data.vendedores) {
          await db.vendedores.bulkPut(data.vendedores.map(item => ({
            ...item,
            sync_status: 'synced'
          })))
        }
        
        // Guardar asignaciones de los vendedores
        if (data.asignaciones) {
          await db.asignaciones.bulkPut(data.asignaciones.map(item => ({
            ...item,
            sync_status: 'synced'
          })))
        }
        
        // Guardar clientes
        if (data.clientes) {
          await db.clientes.bulkPut(data.clientes.map(item => ({
            ...item,
            sync_status: 'synced'
          })))
        }
      })
      
      await this.updateCacheTimestamp(`supervisor_${supervisorId}`)
    } catch (error) {
      console.error('Error caching supervisor data:', error)
    }
  },

  // Obtener datos de supervisor desde cache
  async getCachedSupervisorData(supervisorId) {
    try {
      const vendedores = await db.vendedores
        .where('supervisor_id')
        .equals(supervisorId)
        .toArray()
      
      const vendedorIds = vendedores.map(v => v.id)
      const asignaciones = await db.asignaciones
        .where('vendedor_id')
        .anyOf(vendedorIds)
        .toArray()
      
      const clienteIds = [...new Set(asignaciones.map(a => a.cliente_id))]
      const clientes = await db.clientes
        .where('id')
        .anyOf(clienteIds)
        .toArray()
      
      return {
        vendedores,
        asignaciones,
        clientes,
        timestamp: await this.getCacheTimestamp(`supervisor_${supervisorId}`)
      }
    } catch (error) {
      console.error('Error getting cached supervisor data:', error)
      return null
    }
  },

  // Actualizar timestamp del cache
  async updateCacheTimestamp(key) {
    await db.cache_metadata.put({
      key,
      value: Date.now(),
      timestamp: new Date()
    })
  },

  // Obtener timestamp del cache
  async getCacheTimestamp(key) {
    const metadata = await db.cache_metadata.where('key').equals(key).first()
    return metadata ? metadata.value : null
  },

  // Verificar si el cache está vigente (menos de 1 hora)
  async isCacheValid(key, maxAgeMs = 60 * 60 * 1000) {
    const timestamp = await this.getCacheTimestamp(key)
    if (!timestamp) return false
    return (Date.now() - timestamp) < maxAgeMs
  },

  // Limpiar cache antiguo
  async clearOldCache(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const cutoff = Date.now() - maxAgeMs
      await db.cache_metadata.where('value').below(cutoff).delete()
    } catch (error) {
      console.error('Error clearing old cache:', error)
    }
  }
}

// Funciones de utilidad para manejo de datos offline
export const dataUtils = {
  // Combinar datos online y offline
  mergeData(onlineData, cachedData) {
    if (!cachedData) return onlineData
    if (!onlineData) return cachedData
    
    // Priorizar datos online más recientes
    return {
      ...cachedData,
      ...onlineData,
      timestamp: Date.now()
    }
  },

  // Formatear datos de asignaciones para mostrar
  formatAsignacionesData(asignaciones, clientes, categorias) {
    return asignaciones.map(asignacion => {
      const cliente = clientes.find(c => c.id === asignacion.cliente_id)
      const categoria = categorias.find(c => c.id === asignacion.categoria_id)
      
      return {
        ...asignacion,
        cliente_nombre: cliente?.nombre || 'Cliente no encontrado',
        cliente_codigo: cliente?.codigo || '',
        categoria_nombre: categoria?.nombre || 'Categoría no encontrada',
        categoria_codigo: categoria?.codigo || ''
      }
    })
  },

  // Agrupar asignaciones por cliente
  groupByCliente(asignaciones) {
    const grouped = {}
    
    asignaciones.forEach(asignacion => {
      const clienteId = asignacion.cliente_id
      if (!grouped[clienteId]) {
        grouped[clienteId] = {
          cliente_id: clienteId,
          cliente_nombre: asignacion.cliente_nombre,
          cliente_codigo: asignacion.cliente_codigo,
          categorias: {}
        }
      }
      
      grouped[clienteId].categorias[asignacion.categoria_codigo] = asignacion.estado
    })
    
    return Object.values(grouped)
  }
}
