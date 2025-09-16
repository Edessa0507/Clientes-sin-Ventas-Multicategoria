import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  TrendingUp, 
  Search, 
  Filter, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  User, 
  LogOut, 
  Sun, 
  Moon,
  Package
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useUser } from '../../context/UserContext'
import { vendedorService } from '../../lib/supabase'
import LoadingSpinner from '../ui/LoadingSpinner'

const VendedorDashboard = () => {
  const { user, logout } = useUser()
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  // Estados de datos
  const [clientesData, setClientesData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [stats, setStats] = useState({
    totalClientes: 0,
    clientesActivados: 0,
    clientesFalta: 0,
    porcentajeActivacion: 0
  })
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos') // todos, activado, falta, cero
  const [filterCategory, setFilterCategory] = useState('todas')
  const [filterRuta, setFilterRuta] = useState('todas')
  const [rutasDisponibles, setRutasDisponibles] = useState([]) // todas, ensure, chocolate, alpina, super_de_alim

  // Detectar estado de conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Conexión restaurada')
      loadClientesData() // Recargar datos cuando vuelva la conexión
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast.error('Sin conexión - Mostrando datos guardados')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Cargar datos al montar el componente
  useEffect(() => {
    loadClientesData()
  }, [user])

  // Aplicar filtros cuando cambien los estados
  useEffect(() => {
    filterData()
  }, [clientesData, searchTerm, filterStatus, filterCategory, filterRuta])

  const loadClientesData = async () => {
    setLoading(true)
    try {
      let clientesData = []
      let fromCache = false
      
      if (isOnline) {
        // Cargar desde Supabase usando código de vendedor
        const result = await vendedorService.getClientesByVendedor(user.codigo)
        if (result.data) {
          clientesData = result.data
          // Cache offline simplificado (opcional)
          // await offlineCache.saveVendedorData(user.codigo, clientesData)
          setLastUpdate(new Date())
        } else {
          throw new Error('No se pudieron cargar los datos')
        }
      } else {
        // Sin conexión - mostrar mensaje
        toast.error('Sin conexión a internet')
        setLoading(false)
        return
      }

      // Procesar datos de asignaciones
      const processedData = processVendedorData(clientesData)
      setClientesData(processedData.clientesAgrupados)
      calculateStats(processedData.clientesAgrupados)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const processVendedorData = (asignaciones) => {
    // Procesar asignaciones desnormalizadas directamente
    if (!asignaciones || asignaciones.length === 0) {
      return { clientesAgrupados: [] }
    }

    // Procesar datos para agrupar por cliente
    const clientesMap = new Map()
    const rutasSet = new Set()
    
    asignaciones.forEach(asignacion => {
      const clienteId = asignacion.cliente_codigo
      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          cliente_id: clienteId,
          cliente_nombre: asignacion.cliente_nombre,
          ruta_codigo: asignacion.ruta_codigo,
          ruta_nombre: asignacion.ruta_nombre,
          categorias: {}
        })
      }
      
      const cliente = clientesMap.get(clienteId)
      cliente.categorias[asignacion.categoria_codigo] = {
        estado: asignacion.estado || 0,
        nombre: asignacion.categoria_nombre
      }
      
      // Recopilar rutas disponibles
      if (asignacion.ruta_codigo && asignacion.ruta_nombre) {
        rutasSet.add(`${asignacion.ruta_codigo}|${asignacion.ruta_nombre}`)
      }
    })
    
    // Actualizar rutas disponibles
    const rutasArray = Array.from(rutasSet).map(ruta => {
      const [codigo, nombre] = ruta.split('|')
      return { codigo, nombre }
    })
    setRutasDisponibles(rutasArray)

    const clientesAgrupados = Array.from(clientesMap.values())

    return {
      clientesAgrupados
    }
  }

  const calculateStats = (clientesAgrupados) => {
    const totalClientes = clientesAgrupados.length
    const clientesActivados = clientesAgrupados.filter(cliente => {
      const categorias = Object.values(cliente.categorias)
      return categorias.every(cat => cat.estado === 'Activado')
    }).length
    
    const clientesFalta = totalClientes - clientesActivados
    const porcentajeActivacion = totalClientes > 0 ? Math.round((clientesActivados / totalClientes) * 100) : 0

    setStats({
      totalClientes,
      clientesActivados,
      clientesFalta,
      porcentajeActivacion
    })
  }

  const filterData = () => {
    let filtered = [...clientesData]

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(cliente =>
        cliente.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.cliente_id.includes(searchTerm)
      )
    }

    // Filtro por estado
    if (filterStatus !== 'todos') {
      filtered = filtered.filter(cliente => {
        const categorias = Object.values(cliente.categorias)
        switch (filterStatus) {
          case 'activado':
            return categorias.every(cat => cat.estado === 'Activado')
          case 'falta':
            return categorias.some(cat => cat.estado === 'Activado') && 
                   categorias.some(cat => cat.estado !== 'Activado')
          case 'cero':
            return categorias.every(cat => cat.estado === '0')
          default:
            return true
        }
      })
    }

    // Filtro por categoría específica
    if (filterCategory !== 'todas') {
      filtered = filtered.filter(cliente => {
        const categoria = cliente.categorias[filterCategory.toUpperCase()]
        return categoria && categoria.estado === 'Activado'
      })
    }

    // Filtro por ruta
    if (filterRuta !== 'todas') {
      filtered = filtered.filter(cliente => {
        return cliente.ruta_codigo === filterRuta
      })
    }

    setFilteredData(filtered)
  }

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'Activado':
        return (
          <span className="status-activado">
            <CheckCircle className="w-3 h-3 mr-1" />
            Activado
          </span>
        )
      case 'FALTA':
        return (
          <span className="status-falta">
            <AlertCircle className="w-3 h-3 mr-1" />
            FALTA
          </span>
        )
      default:
        return (
          <span className="status-cero">
            <XCircle className="w-3 h-3 mr-1" />
            0
          </span>
        )
    }
  }

  const getClienteStatus = (categorias) => {
    const estados = Object.values(categorias)
    if (estados.every(cat => cat.estado === 'Activado')) {
      return 'activado'
    } else if (estados.some(cat => cat.estado === 'Activado')) {
      return 'falta'
    } else {
      return 'cero'
    }
  }

  if (loading) {
    return <LoadingSpinner text="Cargando tu dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {user?.nombre}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Vendedor • {user?.codigo}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-3">
              {/* Indicador de conexión - Solo icono en móvil */}
              <div className="flex items-center space-x-1 sm:space-x-2">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-success-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-warning-500" />
                )}
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">
                  {isOnline ? 'En línea' : 'Sin conexión'}
                </span>
              </div>

              {/* Botón modo oscuro/claro */}
              <button
                onClick={() => {
                  const isDark = document.documentElement.classList.contains('dark')
                  if (isDark) {
                    document.documentElement.classList.remove('dark')
                    localStorage.setItem('theme', 'light')
                  } else {
                    document.documentElement.classList.add('dark')
                    localStorage.setItem('theme', 'dark')
                  }
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
                title="Cambiar tema"
              >
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400 dark:hidden" />
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400 hidden dark:block" />
              </button>

              {/* Botón de actualizar */}
              <button
                onClick={loadClientesData}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-manipulation"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Botón de cerrar sesión */}
              <button
                onClick={logout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors touch-manipulation"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
              </div>
              <div className="ml-2 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Clientes
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalClientes}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-success-600" />
              </div>
              <div className="ml-2 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Activados
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.clientesActivados}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-warning-600" />
              </div>
              <div className="ml-2 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Con FALTA
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.clientesFalta}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
              </div>
              <div className="ml-2 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  % Activación
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.porcentajeActivacion}%
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card mb-4 sm:mb-6"
        >
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10 h-10 sm:h-auto text-base sm:text-sm"
                />
              </div>
            </div>

            {/* Filtros en grid para móvil */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-4">
              {/* Filtro por estado */}
              <div className="sm:w-40">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input-field h-10 sm:h-auto text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="activado">Activado</option>
                  <option value="falta">FALTA</option>
                  <option value="cero">Sin activación</option>
                </select>
              </div>

              {/* Filtro por categoría */}
              <div className="sm:w-40">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input-field h-10 sm:h-auto text-sm"
                >
                  <option value="todas">Todas</option>
                  <option value="ensure">Ensure</option>
                  <option value="chocolate">Chocolate</option>
                  <option value="alpina">Alpina</option>
                  <option value="super_de_alim">Super Alim.</option>
                </select>
              </div>

              {/* Filtro por ruta */}
              <div className="sm:w-40">
                <select
                  value={filterRuta}
                  onChange={(e) => setFilterRuta(e.target.value)}
                  className="input-field h-10 sm:h-auto text-sm"
                >
                  <option value="todas">Rutas</option>
                  {rutasDisponibles.map(ruta => (
                    <option key={ruta.codigo} value={ruta.codigo}>
                      {ruta.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lista/Tabla de clientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              Mis Clientes ({filteredData.length})
            </h3>
            {lastUpdate && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Última actualización: {lastUpdate.toLocaleString()}
              </p>
            )}
          </div>

          {/* Vista móvil - Tarjetas */}
          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((cliente, index) => {
                const clienteStatus = getClienteStatus(cliente.categorias)
                return (
                  <motion.div
                    key={cliente.cliente_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 ${
                      clienteStatus === 'activado' ? 'bg-success-50 dark:bg-success-900/20' :
                      clienteStatus === 'falta' ? 'bg-warning-50 dark:bg-warning-900/20' :
                      'bg-white dark:bg-gray-800'
                    }`}
                  >
                    {/* Encabezado del cliente */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {cliente.cliente_nombre}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {cliente.cliente_id} • {cliente.ruta_nombre || 'Sin ruta'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {clienteStatus === 'activado' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            FALTA
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Grid de categorías */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Ensure:</span>
                        {getStatusBadge(cliente.categorias.ENSURE?.estado || '0')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Chocolate:</span>
                        {getStatusBadge(cliente.categorias.CHOCOLATE?.estado || '0')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Alpina:</span>
                        {getStatusBadge(cliente.categorias.ALPINA?.estado || '0')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Super Alim.:</span>
                        {getStatusBadge(cliente.categorias.SUPER_DE_ALIM?.estado || '0')}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ruta
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ensure
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Chocolate
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Alpina
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Super de Alim.
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredData.map((cliente, index) => {
                  const clienteStatus = getClienteStatus(cliente.categorias)
                  return (
                    <motion.tr
                      key={cliente.cliente_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        clienteStatus === 'activado' ? 'bg-success-50 dark:bg-success-900/20' :
                        clienteStatus === 'falta' ? 'bg-warning-50 dark:bg-warning-900/20' :
                        'bg-gray-50 dark:bg-gray-800/50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {cliente.cliente_nombre}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {cliente.cliente_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {cliente.ruta_nombre || 'Sin ruta'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {cliente.ruta_codigo || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(cliente.categorias.ENSURE?.estado || '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(cliente.categorias.CHOCOLATE?.estado || '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(cliente.categorias.ALPINA?.estado || '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(cliente.categorias.SUPER_DE_ALIM?.estado || '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {clienteStatus === 'activado' ? (
                          <span className="status-activado">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activado
                          </span>
                        ) : (
                          <span className="status-falta">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            FALTA
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Estado vacío */}
          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No hay clientes
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || filterStatus !== 'todos' || filterCategory !== 'todas'
                  ? 'No se encontraron clientes con los filtros aplicados.'
                  : 'No tienes clientes asignados aún.'}
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

export default VendedorDashboard
