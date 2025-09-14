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
import toast from 'react-hot-toast'

const DashboardSection = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSupervisores: 0,
    totalClientes: 0,
    ultimaImportacion: null
  })
  const [chartData, setChartData] = useState([])
  const [pieData, setPieData] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const result = await adminService.getDashboardStats()
      if (result.data) {
        setStats(result.data)
        
        // Datos de ejemplo para gráficos
        setChartData([
          { zona: 'Santo Domingo', vendedores: 15, clientes: 450, activacion: 78 },
          { zona: 'Santiago', vendedores: 8, clientes: 280, activacion: 65 },
          { zona: 'Este', vendedores: 6, clientes: 190, activacion: 82 }
        ])

        setPieData([
          { name: 'Ensure', value: 35, color: '#3b82f6' },
          { name: 'Chocolate', value: 28, color: '#10b981' },
          { name: 'Alpina', value: 22, color: '#f59e0b' },
          { name: 'Super de Alim.', value: 15, color: '#ef4444' }
        ])
      }
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
        <div className={`flex-shrink-0 p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900`}>
          <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change && (
            <div className={`flex items-center text-sm ${
              changeType === 'positive' ? 'text-success-600' : 'text-red-600'
            }`}>
              <TrendingUp className="w-4 h-4 mr-1" />
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard Principal
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Resumen general del sistema y métricas clave
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Supervisores"
          value={stats.totalSupervisores}
          icon={UserCheck}
          color="primary"
          change="+2 este mes"
          changeType="positive"
        />
        <StatCard
          title="Total Clientes"
          value={stats.totalClientes.toLocaleString()}
          icon={Users}
          color="success"
          change="+156 esta semana"
          changeType="positive"
        />
        <StatCard
          title="Última Importación"
          value={stats.ultimaImportacion ? 
            new Date(stats.ultimaImportacion.created_at).toLocaleDateString() : 
            'Sin datos'
          }
          icon={Calendar}
          color="warning"
        />
        <StatCard
          title="Rendimiento Global"
          value="74%"
          icon={Target}
          color="primary"
          change="+5% vs mes anterior"
          changeType="positive"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de barras - Rendimiento por zona */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Rendimiento por Zona
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comparación de activación por región
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="zona" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activacion" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Categorías Más Faltantes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Distribución de productos sin activar
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Top vendedores y resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top vendedores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card lg:col-span-2"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Vendedores
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mejores rendimientos del mes
            </p>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Pedro José Burgos', codigo: 'E56', activacion: 92, clientes: 45 },
              { name: 'Luis Manuel de la Cruz', codigo: 'E02', activacion: 88, clientes: 38 },
              { name: 'Yeuri Antonio Pardo', codigo: 'E81', activacion: 85, clientes: 42 }
            ].map((vendedor, index) => (
              <div key={vendedor.codigo} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {vendedor.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {vendedor.codigo} • {vendedor.clientes} clientes
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-success-600">
                    {vendedor.activacion}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Activación
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Resumen general */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resumen General
            </h3>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Activity className="w-5 h-5 text-success-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Ventas Activas
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                1,247
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-primary-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Vendedores Activos
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                29
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-warning-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Categorías con Faltante
                </span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                342
              </span>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Progreso General
                </span>
                <span className="text-sm font-bold text-primary-600">
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
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Importaciones Recientes
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Historial de cargas de datos
          </p>
        </div>
        <div className="overflow-x-auto">
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
