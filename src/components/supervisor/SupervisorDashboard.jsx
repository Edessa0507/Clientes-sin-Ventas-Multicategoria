import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  LogOut, 
  Users, 
  UserCheck, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  User, 
  LogOut, 
  CheckCircle, 
  AlertCircle, 
  Sun, 
  Moon 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useUser } from '../../context/UserContext'
import { supervisorService } from '../../lib/supabase'
import LoadingSpinner from '../ui/LoadingSpinner'

const SupervisorDashboard = () => {
  const { user, logout } = useUser()
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  // Estados de datos
  const [vendedores, setVendedores] = useState([])
  const [filterVendedor, setFilterVendedor] = useState('todos')
  const [filterRuta, setFilterRuta] = useState('todas')
  const [rutasDisponibles, setRutasDisponibles] = useState([])
  const [statsData, setStatsData] = useState({
    totalVendedores: 0,
    totalClientes: 0,
    clientesActivados: 0,
    porcentajeActivacion: 0
  })
  const [vendedorStats, setVendedorStats] = useState([])

  // Detectar estado de conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Conexión restaurada')
      loadData()
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

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user?.codigo) return

    setLoading(true)
    try {
      if (!isOnline) {
        toast.error('Sin conexión a internet')
        setLoading(false)
        return
      }

      // Cargar vendedores por supervisor usando código
      const vendedoresResult = await supervisorService.getVendedoresBySupervisor(user.codigo)
      const vendedoresData = vendedoresResult.data || []

      // Cargar asignaciones por supervisor usando código
      const asignacionesResult = await supervisorService.getAsignacionesBySupervisor(user.codigo)
      const asignacionesData = asignacionesResult.data || []

      setVendedores(vendedoresData)
      
      // Calcular estadísticas
      calculateStats(vendedoresData, asignacionesData)
      setLastUpdate(new Date())

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (vendedoresData, asignacionesData) => {
    const totalVendedores = vendedoresData.length
    
    // Procesar datos para estadísticas por vendedor
    const vendedorMap = new Map()
    const rutasSet = new Set()
    
    asignacionesData.forEach(asignacion => {
      const vendedorCodigo = asignacion.vendedor_codigo
      if (!vendedorMap.has(vendedorCodigo)) {
        vendedorMap.set(vendedorCodigo, {
          vendedor: {
            codigo: vendedorCodigo,
            nombre_completo: asignacion.vendedor_nombre,
            ruta_codigo: asignacion.ruta_codigo,
            ruta_nombre: asignacion.ruta_nombre
          },
          clientes: new Map(),
          totalActivaciones: 0
        })
      }
      
      const vendedorData = vendedorMap.get(vendedorCodigo)
      const clienteCodigo = asignacion.cliente_codigo
      
      if (!vendedorData.clientes.has(clienteCodigo)) {
        vendedorData.clientes.set(clienteCodigo, {
          codigo: clienteCodigo,
          nombre: asignacion.cliente_nombre,
          ruta_codigo: asignacion.ruta_codigo,
          ruta_nombre: asignacion.ruta_nombre,
          categorias: {}
        })
      }
      
      const cliente = vendedorData.clientes.get(clienteCodigo)
      cliente.categorias[asignacion.categoria_codigo] = {
        estado: asignacion.estado || 0,
        nombre: asignacion.categoria_nombre
      }
      
      // Contar activaciones
      if (asignacion.estado === 'Activado') {
        vendedorData.totalActivaciones++
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

    // Calcular stats por vendedor
    const vendedorStatsData = Array.from(vendedorMap.values()).map(vendedorData => {
      const totalClientes = vendedorData.clientes.size
      const clientesActivados = Array.from(vendedorData.clientes.values()).filter(cliente => {
        const categorias = Object.values(cliente.categorias)
        return categorias.length === 4 && categorias.every(categoria => categoria.estado === 'Activado')
      }).length

      const porcentajeActivacion = totalClientes > 0 ? Math.round((clientesActivados / totalClientes) * 100) : 0

      return {
        vendedor: vendedorData.vendedor,
        totalClientes,
        clientesActivados,
        porcentajeActivacion,
        totalAsignaciones: vendedorData.totalActivaciones,
        activacionesTotales: vendedorData.totalActivaciones
      }
    })

    setVendedorStats(vendedorStatsData)

    // Stats generales
    const totalClientes = vendedorStatsData.reduce((sum, v) => sum + v.totalClientes, 0)
    const clientesActivados = vendedorStatsData.reduce((sum, v) => sum + v.clientesActivados, 0)
    const porcentajeActivacion = totalClientes > 0 ? Math.round((clientesActivados / totalClientes) * 100) : 0

    setStatsData({
      totalVendedores,
      totalClientes,
      clientesActivados,
      porcentajeActivacion
    })
  }

  const handleVendedorToggle = (vendedorCodigo) => {
    // No implementado
  }

  const selectAllVendedores = () => {
    // No implementado
  }

  const clearSelection = () => {
    // No implementado
  }

  const filteredVendedorStats = vendedorStats.filter(stat => 
    (filterVendedor === 'todos' || stat.vendedor.codigo === filterVendedor) &&
    (filterRuta === 'todas' || stat.vendedor.ruta_codigo === filterRuta)
  )

  if (loading) {
    return <LoadingSpinner text="Cargando panel de supervisor..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-success-100 dark:bg-success-900 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {user?.nombre}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supervisor • {user?.codigo}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Indicador de conexión */}
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-success-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-warning-500" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
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
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Cambiar tema"
              >
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400 dark:hidden" />
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400 hidden dark:block" />
              </button>

              {/* Botón de actualizar */}
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Botón de cerrar sesión */}
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Vendedores
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsData.totalVendedores}
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
                <User className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Clientes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsData.totalClientes}
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
                <CheckCircle className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Clientes Activados
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsData.clientesActivados}
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
                <TrendingUp className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  % Activación Total
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsData.porcentajeActivacion}%
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filtros de vendedores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Filtrar Vendedores
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={selectAllVendedores}
                className="btn-secondary text-sm"
              >
                Todos
              </button>
              <button
                onClick={clearSelection}
                className="btn-secondary text-sm"
              >
                Ninguno
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vendedores.map(vendedor => (
              <label
                key={vendedor.codigo}
                className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleVendedorToggle(vendedor.codigo)}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {vendedor.nombre_completo}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {vendedor.codigo}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Filtro por vendedor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Filtro por vendedor
            </h3>
          </div>

          <div className="sm:w-64">
            <select
              value={filterVendedor}
              onChange={(e) => setFilterVendedor(e.target.value)}
              className="input-field"
            >
              <option value="todos">Todos los vendedores</option>
              {vendedorStats.map(stat => (
                <option key={stat.vendedor.codigo} value={stat.vendedor.codigo}>
                  {stat.vendedor.nombre_completo}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Filtro por ruta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Filtro por ruta
            </h3>
          </div>

          <div className="sm:w-48">
            <select
              value={filterRuta}
              onChange={(e) => setFilterRuta(e.target.value)}
              className="input-field"
            >
              <option value="todas">Todas las rutas</option>
              {rutasDisponibles.map(ruta => (
                <option key={ruta.codigo} value={ruta.codigo}>
                  {ruta.nombre}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Tabla de rendimiento por vendedor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Rendimiento por Vendedor ({filteredVendedorStats.length} seleccionados)
            </h3>
            {lastUpdate && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Última actualización: {lastUpdate.toLocaleString()}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ruta
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Clientes
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activados
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    % Activación
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Activaciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredVendedorStats.map((stat, index) => (
                  <motion.tr
                    key={stat.vendedor.codigo}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {stat.vendedor.nombre_completo}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {stat.vendedor.codigo}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {stat.vendedor.ruta_nombre || 'Sin ruta'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {stat.vendedor.ruta_codigo || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                      {stat.totalClientes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200">
                        {stat.clientesActivados}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700 mr-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${stat.porcentajeActivacion}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {stat.porcentajeActivacion}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                      {stat.activacionesTotales}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {filteredVendedorStats.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No hay vendedores seleccionados
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Selecciona uno o más vendedores para ver sus estadísticas.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default SupervisorDashboard
