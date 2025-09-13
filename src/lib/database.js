import Dexie from 'dexie'

// Base de datos IndexedDB para funcionalidad offline
export class OfflineDatabase extends Dexie {
  constructor() {
    super('ClientesAppDB')
    
    this.version(1).stores({
      asignaciones: '++id, fecha_reporte, vendedor_codigo, cliente_codigo, categoria_codigo, estado',
      clientes: 'codigo, nombre',
      categorias: 'codigo, nombre',
      vendedores: 'vendedor_codigo, nombre, rol, zona',
      sync_status: 'key, last_sync, data'
    })
  }
}

export const offlineDB = new OfflineDatabase()

// Funciones para manejo offline
export const offline = {
  // Guardar asignaciones en cache
  async cacheAsignaciones(vendedorCodigo, asignaciones) {
    try {
      // Limpiar cache anterior del vendedor
      await offlineDB.asignaciones
        .where('vendedor_codigo')
        .equals(vendedorCodigo)
        .delete()

      // Guardar nuevas asignaciones
      await offlineDB.asignaciones.bulkAdd(asignaciones)
      
      // Actualizar timestamp de sincronización
      await offlineDB.sync_status.put({
        key: `asignaciones_${vendedorCodigo}`,
        last_sync: new Date().toISOString(),
        data: { count: asignaciones.length }
      })

      return true
    } catch (error) {
      console.error('Error caching asignaciones:', error)
      return false
    }
  },

  // Obtener asignaciones desde cache
  async getCachedAsignaciones(vendedorCodigo) {
    try {
      const asignaciones = await offlineDB.asignaciones
        .where('vendedor_codigo')
        .equals(vendedorCodigo)
        .toArray()

      return asignaciones
    } catch (error) {
      console.error('Error getting cached asignaciones:', error)
      return []
    }
  },

  // Guardar clientes en cache
  async cacheClientes(clientes) {
    try {
      await offlineDB.clientes.clear()
      await offlineDB.clientes.bulkAdd(clientes)
      
      await offlineDB.sync_status.put({
        key: 'clientes',
        last_sync: new Date().toISOString(),
        data: { count: clientes.length }
      })

      return true
    } catch (error) {
      console.error('Error caching clientes:', error)
      return false
    }
  },

  // Obtener clientes desde cache
  async getCachedClientes() {
    try {
      return await offlineDB.clientes.toArray()
    } catch (error) {
      console.error('Error getting cached clientes:', error)
      return []
    }
  },

  // Guardar categorías en cache
  async cacheCategorias(categorias) {
    try {
      await offlineDB.categorias.clear()
      await offlineDB.categorias.bulkAdd(categorias)
      
      await offlineDB.sync_status.put({
        key: 'categorias',
        last_sync: new Date().toISOString(),
        data: { count: categorias.length }
      })

      return true
    } catch (error) {
      console.error('Error caching categorias:', error)
      return false
    }
  },

  // Obtener categorías desde cache
  async getCachedCategorias() {
    try {
      return await offlineDB.categorias.toArray()
    } catch (error) {
      console.error('Error getting cached categorias:', error)
      return []
    }
  },

  // Guardar vendedores en cache
  async cacheVendedores(vendedores) {
    try {
      await offlineDB.vendedores.clear()
      await offlineDB.vendedores.bulkAdd(vendedores)
      
      await offlineDB.sync_status.put({
        key: 'vendedores',
        last_sync: new Date().toISOString(),
        data: { count: vendedores.length }
      })

      return true
    } catch (error) {
      console.error('Error caching vendedores:', error)
      return false
    }
  },

  // Obtener vendedores desde cache
  async getCachedVendedores() {
    try {
      return await offlineDB.vendedores.toArray()
    } catch (error) {
      console.error('Error getting cached vendedores:', error)
      return []
    }
  },

  // Obtener estado de sincronización
  async getSyncStatus(key) {
    try {
      return await offlineDB.sync_status.get(key)
    } catch (error) {
      console.error('Error getting sync status:', error)
      return null
    }
  },

  // Limpiar toda la cache
  async clearCache() {
    try {
      await offlineDB.asignaciones.clear()
      await offlineDB.clientes.clear()
      await offlineDB.categorias.clear()
      await offlineDB.vendedores.clear()
      await offlineDB.sync_status.clear()
      return true
    } catch (error) {
      console.error('Error clearing cache:', error)
      return false
    }
  }
}

// Detectar estado de conexión
export const connectivity = {
  isOnline: () => navigator.onLine,
  
  // Escuchar cambios de conectividad
  onStatusChange(callback) {
    const handleOnline = () => callback(true)
    const handleOffline = () => callback(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Retornar función para limpiar listeners
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }
}
