import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  Upload, 
  Database, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  RefreshCw,
  Calendar,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase'
import ThemeToggle from '../components/ThemeToggle'
import LoadingSpinner from '../components/LoadingSpinner'
import StatsCard from '../components/StatsCard'
import ExcelImporter from '../components/ExcelImporter'
import AdminStats from '../components/AdminStats'
import toast from 'react-hot-toast'

const AdminDashboard = () => {
  const { user, signOut, isOnline } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalVendedores: 0,
    totalClientes: 0,
    totalAsignaciones: 0,
    ultimaImportacion: null
  })
  const [recentImports, setRecentImports] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      if (!isOnline) {
        toast.error('Sin conexión - Funcionalidad limitada')
        setLoading(false)
        return
      }

      // Cargar estadísticas generales
      const [vendedoresRes, clientesRes, asignacionesRes] = await Promise.all([
        db.getVendedores(),
        db.getClientes(),
        // Obtener asignaciones recientes (último mes)
        db.supabase
          .from('asignaciones')
          .select('*')
          .gte('fecha_reporte', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ])

      // Filtrar solo supervisores para el contador principal
      const supervisores = (vendedoresRes.data || []).filter(v => v.rol === 'supervisor')
      
      setStats({
        totalVendedores: supervisores.length, // Ahora muestra supervisores
        totalClientes: clientesRes.data?.length || 0,
        totalAsignaciones: asignacionesRes.data?.length || 0,
        ultimaImportacion: null // Se actualizará con datos reales
      })

      // Cargar importaciones recientes
      const { data: imports } = await db.supabase
        .from('import_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentImports(imports || [])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Error cargando datos del dashboard')
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
    await loadDashboardData()
    setRefreshing(false)
    toast.success('Datos actualizados')
  }

  const handleImportComplete = () => {
    // Recargar datos después de una importación exitosa
    loadDashboardData()
    toast.success('Importación completada - Datos actualizados')
  }

  const tabs = [
    { id: 'overview', name: 'Resumen', icon: BarChart3 },
    { id: 'import', name: 'Importar Excel', icon: Upload },
    { id: 'users', name: 'Usuarios', icon: Users },
    { id: 'settings', name: 'Configuración', icon: Settings }
  ]

  if (loading) {
    return <LoadingSpinner text="Cargando panel de administración..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Panel de Administración
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gestión del sistema
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {!isOnline && (
                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Sin conexión</span>
                </div>
              )}
              
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
        {/* Tabs Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Total Supervisores"
                  value={stats.totalVendedores}
                  icon={Users}
                  color="blue"
                />
                <StatsCard
                  title="Total Clientes"
                  value={stats.totalClientes}
                  icon={Database}
                  color="green"
                />
                <StatsCard
                  title="Asignaciones (30d)"
                  value={stats.totalAsignaciones}
                  icon={BarChart3}
                  color="purple"
                />
                <StatsCard
                  title="Última Importación"
                  value={recentImports.length > 0 ? 'Hoy' : 'N/A'}
                  icon={FileSpreadsheet}
                  color="yellow"
                />
              </div>

              {/* Componente de estadísticas detalladas */}
              <AdminStats />

              {/* Importaciones recientes */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Importaciones Recientes
                </h3>
                {recentImports.length > 0 ? (
                  <div className="space-y-3">
                    {recentImports.slice(0, 5).map((importRun) => (
                      <div key={importRun.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(importRun.fecha).toLocaleDateString('es-ES')}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {importRun.filas_procesadas} filas • {importRun.usuario_admin}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(importRun.created_at).toLocaleString('es-ES')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No hay importaciones recientes
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Importar Datos desde Excel
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Sube un archivo Excel con los datos de clientes y categorías. El sistema procesará automáticamente las columnas y reemplazará los datos existentes para la fecha seleccionada.
                </p>
                
                {!isOnline ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-yellow-800 dark:text-yellow-200">
                        La importación requiere conexión a internet
                      </p>
                    </div>
                  </div>
                ) : (
                  <ExcelImporter onImportComplete={handleImportComplete} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Gestión de Usuarios
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-200">
                    🚧 Funcionalidad en desarrollo
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                    La gestión de usuarios se realizará directamente en la base de datos por ahora.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Configuración del Sistema
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Información del Sistema
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Versión: 1.0.0</p>
                      <p>Base de datos: Supabase</p>
                      <p>Modo: {isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-yellow-800 dark:text-yellow-200">
                      ⚙️ Configuraciones adicionales disponibles próximamente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default AdminDashboard
