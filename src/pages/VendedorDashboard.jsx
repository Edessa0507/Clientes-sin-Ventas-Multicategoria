import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Calendar, 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  LogOut,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase'
import { offline, connectivity } from '../lib/database'
import ThemeToggle from '../components/ThemeToggle'
import LoadingSpinner from '../components/LoadingSpinner'
import ClienteCard from '../components/ClienteCard'
import StatsCard from '../components/StatsCard'
import toast from 'react-hot-toast'

const VendedorDashboard = () => {
  const { vendedor, signOut, isOnline } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [asignaciones, setAsignaciones] = useState([])
  const [filteredAsignaciones, setFilteredAsignaciones] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('')
  const [categorias, setCategorias] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    activados: 0,
    faltas: 0,
    ceros: 0,
    porcentajeActivacion: 0
  })

  useEffect(() => {
    loadData()
  }, [vendedor])

  useEffect(() => {
    applyFilters()
  }, [asignaciones, searchTerm, selectedCategoria, selectedEstado])

  const loadData = async () => {
    if (!vendedor?.codigo) return

    setLoading(true)
    try {
      let data = []
      let categoriasData = []

      if (isOnline) {
        // Cargar desde Supabase
        const { data: asignacionesData, error } = await db.getAsignacionesByVendedor(
          vendedor.codigo
        )
        
        if (error) throw error
        data = asignacionesData || []

        // Cargar categorías
        const { data: catData } = await db.getCategorias()
        categoriasData = catData || []

        // Guardar en cache
        await offline.cacheAsignaciones(vendedor.codigo, data)
        await offline.cacheCategorias(categoriasData)
      } else {
        // Cargar desde cache
        data = await offline.getCachedAsignaciones(vendedor.codigo)
        categoriasData = await offline.getCachedCategorias()
        
        if (data.length === 0) {
          toast.error('No hay datos disponibles offline')
        }
      }

      setAsignaciones(data)
      setCategorias(categoriasData)
      calculateStats(data)
      
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

  const calculateStats = (data) => {
    const total = data.length
    const activados = data.filter(a => a.estado === 'ACTIVADO').length
    const faltas = data.filter(a => a.estado === 'FALTA').length
    const ceros = data.filter(a => a.estado === '0').length
    const porcentajeActivacion = total > 0 ? Math.round((activados / total) * 100) : 0

    setStats({
      total,
      activados,
      faltas,
      ceros,
      porcentajeActivacion
    })
  }

  const applyFilters = () => {
    let filtered = [...asignaciones]

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(a => 
        a.clientes?.cliente_nombre?.toLowerCase().includes(term) ||
        a.cliente_id.toString().includes(term)
      )
    }

    // Filtro por categoría
    if (selectedCategoria) {
      filtered = filtered.filter(a => a.categorias?.categoria_nombre === selectedCategoria)
    }

    // Filtro por estado
    if (selectedEstado) {
      filtered = filtered.filter(a => a.estado === selectedEstado)
    }

    setFilteredAsignaciones(filtered)
  }

  // Agrupar asignaciones por cliente
  const clientesAgrupados = filteredAsignaciones.reduce((acc, asignacion) => {
    const clienteCodigo = asignacion.cliente_codigo
    if (!acc[clienteCodigo]) {
      acc[clienteCodigo] = {
        codigo: clienteCodigo,
        nombre: asignacion.clientes?.nombre || `Cliente ${clienteCodigo}`,
        asignaciones: []
      }
    }
    acc[clienteCodigo].asignaciones.push(asignacion)
    return acc
  }, {})

  const clientesList = Object.values(clientesAgrupados)

  if (loading) {
    return <LoadingSpinner text="Cargando dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {vendedor?.nombre}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Código: {vendedor?.codigo}
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
            title="Total Asignaciones"
            value={stats.total}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Activados"
            value={stats.activados}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="Pendientes"
            value={stats.faltas}
            icon={AlertTriangle}
            color="yellow"
          />
          <StatsCard
            title="% Activación"
            value={`${stats.porcentajeActivacion}%`}
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* Filtros */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Búsqueda */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="input-field"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat.categoria_id} value={cat.categoria_nombre}>
                    {cat.categoria_nombre}
                  </option>
                ))}
              </select>

              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="input-field"
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVADO">Activado</option>
                <option value="FALTA">Falta</option>
                <option value="0">Sin activar</option>
              </select>
            </div>
          </div>

          {/* Resumen de filtros */}
          {(searchTerm || selectedCategoria || selectedEstado) && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {filteredAsignaciones.length} de {asignaciones.length} asignaciones
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategoria('')
                    setSelectedEstado('')
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Clientes */}
        <div className="space-y-4">
          {clientesList.length > 0 ? (
            clientesList.map(cliente => (
              <motion.div
                key={cliente.cliente_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ClienteCard cliente={cliente} />
              </motion.div>
            ))
          ) : (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron resultados
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {asignaciones.length === 0 
                  ? 'No tienes asignaciones disponibles'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VendedorDashboard
