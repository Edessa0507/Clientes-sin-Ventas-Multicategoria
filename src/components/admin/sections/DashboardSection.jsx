import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserCheck, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  PieChart,
  Activity,
  Target,
  Award,
  AlertTriangle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import { adminService } from '../../../lib/supabase'
import { dashboardService } from '../../../lib/dashboardService'
import { auth } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const DashboardSection = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSupervisores: 0,
    totalClientes: 0,
    ultimaImportacion: null
  })
  const [dashboardData, setDashboardData] = useState(null)
  const [chartData, setChartData] = useState([])
  const [pieData, setPieData] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Cargar estadísticas básicas corregidas
      const adminStats = await dashboardService.getAdminStats()
      setStats({
        totalSupervisores: adminStats.totalSupervisores || 0,
        totalVendedores: adminStats.totalVendedores || 0,
        totalClientes: adminStats.totalClientes || 0,
        ultimaImportacion: adminStats.ultimaImportacion
      })
      
      // Cargar datos para gráficos y tabla
      const [rendimientoRutas, activacionCategoria, recentData] = await Promise.all([
        dashboardService.getRendimientoPorRuta(),
        dashboardService.getActivacionPorCategoria({}),
        dashboardService.getRecentData(15)
      ])
      
      // Preparar datos para gráfico de barras (rendimiento por ruta)
      if (rendimientoRutas.data) {
        const chartData = rendimientoRutas.data.slice(0, 10).map(ruta => ({
          name: ruta.ruta.length > 15 ? ruta.ruta.substring(0, 15) + '...' : ruta.ruta,
          value: ruta.porcentaje,
          total: ruta.total,
          activados: ruta.activados
        }))
        setChartData(chartData)
      }
      
      // Preparar datos para gráfico circular (categorías más faltantes)
      if (activacionCategoria.data) {
        const pieData = activacionCategoria.data.map(cat => ({
          name: cat.categoria,
          value: cat.total - cat.activados, // Clientes sin activar
          porcentaje: 100 - cat.porcentaje
        })).sort((a, b) => b.value - a.value).slice(0, 4)
        setPieData(pieData)
      }
      
      setDashboardData({
        rendimientoRutas: rendimientoRutas.data || [],
        activacionCategoria: activacionCategoria.data || [],
        recentData: recentData.data || []
      })
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Error al cargar las estadísticas')
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color, change, changeType }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-2 sm:p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900`}>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
        <div className="ml-3 sm:ml-4 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {title}
          </p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change && (
            <div className={`flex items-center text-xs sm:text-sm ${
              changeType === 'positive' ? 'text-success-600' : 'text-red-600'
            }`}>
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              {change}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard Principal
        </h2>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Resumen general del sistema y métricas clave
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Supervisores"
          value={stats.totalSupervisores || 0}
          icon={UserCheck}
          color="primary"
        />
        <StatCard
          title="Total Vendedores"
          value={stats.totalVendedores || 0}
          icon={Users}
          color="success"
        />
        <StatCard
          title="Total Clientes"
          value={(stats.totalClientes || 0).toLocaleString()}
          icon={Users}
          color="warning"
        />
        <StatCard
          title="Última Importación"
          value={stats.ultimaImportacion ? 
            new Date(stats.ultimaImportacion).toLocaleDateString() : 
            'Sin datos'
          }
          icon={Calendar}
          color="primary"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Gráfico de barras - Rendimiento por ruta */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Rendimiento por Ruta
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Top 10 rutas con mejor porcentaje de activación
            </p>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`,
                    'Porcentaje de Activación'
                  ]}
                  labelFormatter={(label) => `Ruta: ${label}`}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Gráfico de pastel - Distribución de categorías */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Categorías Más Faltantes
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Distribución de productos sin activar
            </p>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={window.innerWidth < 640 ? 60 : 80}
                  dataKey="value"
                  label={window.innerWidth < 640 ? false : ({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#f59e0b', '#10b981'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Top vendedores y resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Datos cargados - limitados a 15 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card lg:col-span-2"
        >
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Datos Cargados (Últimos 15)
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Vista previa de los datos en el sistema
            </p>
          </div>

          {/* Vista móvil - Tarjetas */}
          <div className="block sm:hidden">
            <div className="space-y-3">
              {dashboardData?.recentData?.slice(0, 15).map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.cliente_nombre}
                    </h4>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                      {item.categoria_nombre}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Vendedor:</span>
                      <br />
                      {item.vendedor_nombre}
                    </div>
                    <div>
                      <span className="font-medium">Ruta:</span>
                      <br />
                      {item.ruta_nombre || 'Sin ruta'}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No hay datos disponibles
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Cliente
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Vendedor
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Ruta
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Categoría
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {dashboardData?.recentData?.slice(0, 15).map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                      {item.cliente_nombre}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {item.vendedor_nombre}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {item.ruta_nombre || 'Sin ruta'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {item.categoria_nombre}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan="4" className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No hay datos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Resumen general */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Resumen General
            </h3>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-success-500" />
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Ventas Activas
                </span>
              </div>
              <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                1,247
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Vendedores Activos
                </span>
              </div>
              <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                29
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning-500" />
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Categorías con Faltante
                </span>
              </div>
              <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                342
              </span>
            </div>
            
            <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                  Progreso General
                </span>
                <span className="text-xs sm:text-sm font-bold text-primary-600">
                  74%
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div className="bg-primary-600 h-2 rounded-full transition-all duration-300" style={{ width: '74%' }}></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabla de importaciones recientes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Importaciones Recientes
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Historial de cargas de datos
          </p>
        </div>

        {/* Vista móvil - Tarjetas */}
        <div className="block sm:hidden">
          <div className="space-y-3">
            {[
              { fecha: '2024-01-15', tipo: 'Reemplazo', registros: 1247, estado: 'Completado' },
              { fecha: '2024-01-14', tipo: 'Incremental', registros: 89, estado: 'Completado' },
              { fecha: '2024-01-13', tipo: 'Reemplazo', registros: 1156, estado: 'Error' }
            ].map((importacion, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {importacion.fecha}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {importacion.tipo}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    importacion.estado === 'Completado' 
                      ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {importacion.estado}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Registros:</span> {importacion.registros.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vista desktop - Tabla */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Registros
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { fecha: '2024-01-15', tipo: 'Reemplazo', registros: 1247, estado: 'Completado' },
                { fecha: '2024-01-14', tipo: 'Incremental', registros: 89, estado: 'Completado' },
                { fecha: '2024-01-13', tipo: 'Reemplazo', registros: 1156, estado: 'Error' }
              ].map((importacion, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {importacion.fecha}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {importacion.tipo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {importacion.registros.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      importacion.estado === 'Completado' 
                        ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {importacion.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

export default DashboardSection
