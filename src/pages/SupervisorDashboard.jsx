import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  TrendingUp, 
  Filter, 
  Search, 
  LogOut, 
  RefreshCw,
  Eye,
  BarChart3,
  UserCheck
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase'
import { offline } from '../lib/database'
import ThemeToggle from '../components/ThemeToggle'
import LoadingSpinner from '../components/LoadingSpinner'
import StatsCard from '../components/StatsCard'
import VendedorCard from '../components/VendedorCard'
import toast from 'react-hot-toast'

const SupervisorDashboard = () => {
  const { vendedor, signOut, isOnline } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [asignaciones, setAsignaciones] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [selectedVendedor, setSelectedVendedor] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredData, setFilteredData] = useState([])
  const [stats, setStats] = useState({
    totalVendedores: 0,
    totalAsignaciones: 0,
    promedioActivacion: 0,
    mejorVendedor: null
  })

  useEffect(() => {
    loadData()
  }, [vendedor])

  useEffect(() => {
    applyFilters()
  }, [asignaciones, selectedVendedor, searchTerm])

  const loadData = async () => {
    if (!vendedor?.zona) return

    setLoading(true)
    try {
      let asignacionesData = []
      let vendedoresData = []

      if (isOnline) {
        // Cargar asignaciones de la zona del supervisor
        const { data: asigData, error: asigError } = await db.getAsignacionesBySupervisor(
          vendedor.zona,
          vendedor.rutas
        )
        
        if (asigError) throw asigError
        asignacionesData = asigData || []

        // Cargar vendedores de la zona
        const { data: vendData, error: vendError } = await db.getVendedores()
        if (vendError) throw vendError
        
        vendedoresData = (vendData || []).filter(v => 
          v.zona === vendedor.zona && v.rol === 'vendedor'
        )

        // Guardar en cache
        await offline.cacheAsignaciones(`supervisor_${vendedor.zona}`, asignacionesData)
        await offline.cacheVendedores(vendedoresData)
      } else {
        // Cargar desde cache
        asignacionesData = await offline.getCachedAsignaciones(`supervisor_${vendedor.zona}`)
        const allVendedores = await offline.getCachedVendedores()
        vendedoresData = allVendedores.filter(v => 
          v.zona === vendedor.zona && v.rol === 'vendedor'
        )
        
        if (asignacionesData.length === 0) {
          toast.error('No hay datos disponibles offline')
        }
      }

      setAsignaciones(asignacionesData)
      setVendedores(vendedoresData)
      calculateStats(asignacionesData, vendedoresData)
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    if (!isOnline) {
      toast.error('Sin conexión para actualizar')
      return
    }

    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast.success('Datos actualizados')
  }

  const calculateStats = (asignacionesData, vendedoresData) => {
    const totalVendedores = vendedoresData.length
    const totalAsignaciones = asignacionesData.length
    
    // Calcular promedio de activación
    const activados = asignacionesData.filter(a => a.estado === 'ACTIVADO').length
    const promedioActivacion = totalAsignaciones > 0 ? Math.round((activados / totalAsignaciones) * 100) : 0

    // Encontrar mejor vendedor
    const vendedorStats = vendedoresData.map(vendedor => {
      const asignacionesVendedor = asignacionesData.filter(a => a.vendedor_codigo === vendedor.codigo)
      const activadosVendedor = asignacionesVendedor.filter(a => a.estado === 'ACTIVADO').length
      const porcentaje = asignacionesVendedor.length > 0 ? 
        Math.round((activadosVendedor / asignacionesVendedor.length) * 100) : 0
      
      return {
        ...vendedor,
        porcentajeActivacion: porcentaje,
        totalAsignaciones: asignacionesVendedor.length
      }
    })

    const mejorVendedor = vendedorStats.reduce((mejor, actual) => 
      actual.porcentajeActivacion > (mejor?.porcentajeActivacion || 0) ? actual : mejor
    , null)

    setStats({
      totalVendedores,
      totalAsignaciones,
      promedioActivacion,
      mejorVendedor
    })
  }

  const applyFilters = () => {
    let filtered = [...asignaciones]

    // Filtro por vendedor
    if (selectedVendedor) {
      filtered = filtered.filter(a => a.vendedor_codigo === selectedVendedor)
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(a => 
        a.clientes?.nombre?.toLowerCase().includes(term) ||
        a.cliente_codigo?.toLowerCase().includes(term) ||
        a.vendedor_codigo.toLowerCase().includes(term) ||
        a.categorias?.nombre?.toLowerCase().includes(term)
      )
    }

    setFilteredData(filtered)
  }

  // Agrupar datos por vendedor
  const vendedoresConDatos = vendedores.map(vendedor => {
    const asignacionesVendedor = filteredData.filter(a => a.vendedor_codigo === vendedor.codigo)
    const clientesUnicos = [...new Set(asignacionesVendedor.map(a => a.cliente_codigo))].length
    const activados = asignacionesVendedor.filter(a => a.estado === 'ACTIVADO').length
    const faltas = asignacionesVendedor.filter(a => a.estado === 'FALTA').length
    const porcentajeActivacion = asignacionesVendedor.length > 0 ? 
      Math.round((activados / asignacionesVendedor.length) * 100) : 0

    return {
      ...vendedor,
      asignaciones: asignacionesVendedor,
      clientesUnicos,
      activados,
      faltas,
      porcentajeActivacion
    }
  })

  if (loading) {
    return <LoadingSpinner text="Cargando dashboard de supervisor..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {vendedor?.nombre}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supervisor - Zona {vendedor?.zona}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={refreshData}
                disabled={refreshing || !isOnline}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <ThemeToggle />
              
              <button
                onClick={signOut}
                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Vendedores"
            value={stats.totalVendedores}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Total Asignaciones"
            value={stats.totalAsignaciones}
            icon={BarChart3}
            color="purple"
          />
          <StatsCard
            title="% Promedio Activación"
            value={`${stats.promedioActivacion}%`}
            icon={TrendingUp}
            color="green"
          />
          <StatsCard
            title="Mejor Vendedor"
            value={stats.mejorVendedor ? `${stats.mejorVendedor.porcentajeActivacion}%` : 'N/A'}
            icon={UserCheck}
            color="yellow"
          />
        </div>

        {/* Mejor vendedor destacado */}
        {stats.mejorVendedor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-1">
                  🏆 Mejor Rendimiento
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  <span className="font-medium">{stats.mejorVendedor.nombre}</span> ({stats.mejorVendedor.vendedor_codigo})
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {stats.mejorVendedor.porcentajeActivacion}% de activación • {stats.mejorVendedor.totalAsignaciones} asignaciones
                </p>
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.mejorVendedor.porcentajeActivacion}%
              </div>
            </div>
          </motion.div>
        )}

        {/* Filtros */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Búsqueda */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente o vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Filtro por vendedor */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedVendedor}
                onChange={(e) => setSelectedVendedor(e.target.value)}
                className="input-field"
              >
                <option value="">Todos los vendedores</option>
                {vendedores.map(vendedor => (
                  <option key={vendedor.vendedor_codigo} value={vendedor.vendedor_codigo}>
                    {vendedor.nombre} ({vendedor.vendedor_codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resumen de filtros */}
          {(searchTerm || selectedVendedor) && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {filteredData.length} de {asignaciones.length} asignaciones
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedVendedor('')
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Vendedores */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Rendimiento por Vendedor
          </h2>
          
          <div className="grid gap-6">
            {vendedoresConDatos.map(vendedor => (
              <motion.div
                key={vendedor.vendedor_codigo}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <VendedorCard vendedor={vendedor} />
              </motion.div>
            ))}
          </div>

          {vendedoresConDatos.length === 0 && (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay vendedores disponibles
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No se encontraron vendedores en tu zona asignada
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SupervisorDashboard
