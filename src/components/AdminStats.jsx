import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { db } from '../lib/supabase'
import LoadingSpinner from './LoadingSpinner'

const AdminStats = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    porZona: [],
    topVendedores: [],
    categoriasMasFaltantes: [],
    tendenciaActivacion: []
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Obtener estadísticas por zona
      const { data: asignaciones } = await db.supabase
        .from('asignaciones')
        .select(`
          zona,
          vendedor_codigo,
          estado,
          categorias(categoria_nombre)
        `)

      if (asignaciones) {
        // Procesar estadísticas por zona
        const zonaStats = {}
        const vendedorStats = {}
        const categoriaStats = {}

        asignaciones.forEach(asignacion => {
          // Stats por zona
          if (!zonaStats[asignacion.zona]) {
            zonaStats[asignacion.zona] = { total: 0, activados: 0 }
          }
          zonaStats[asignacion.zona].total++
          if (asignacion.estado === 'ACTIVADO') {
            zonaStats[asignacion.zona].activados++
          }

          // Stats por vendedor
          if (!vendedorStats[asignacion.vendedor_codigo]) {
            vendedorStats[asignacion.vendedor_codigo] = { total: 0, activados: 0 }
          }
          vendedorStats[asignacion.vendedor_codigo].total++
          if (asignacion.estado === 'ACTIVADO') {
            vendedorStats[asignacion.vendedor_codigo].activados++
          }

          // Stats por categoría (faltas)
          if (asignacion.estado === 'FALTA' && asignacion.categorias?.categoria_nombre) {
            const catName = asignacion.categorias.categoria_nombre
            categoriaStats[catName] = (categoriaStats[catName] || 0) + 1
          }
        })

        // Convertir a arrays y calcular porcentajes
        const porZona = Object.entries(zonaStats).map(([zona, data]) => ({
          zona,
          total: data.total,
          activados: data.activados,
          porcentaje: data.total > 0 ? Math.round((data.activados / data.total) * 100) : 0
        })).sort((a, b) => b.porcentaje - a.porcentaje)

        const topVendedores = Object.entries(vendedorStats)
          .map(([codigo, data]) => ({
            vendedor_codigo: codigo,
            total: data.total,
            activados: data.activados,
            porcentaje: data.total > 0 ? Math.round((data.activados / data.total) * 100) : 0
          }))
          .sort((a, b) => b.porcentaje - a.porcentaje)
          .slice(0, 10)

        const categoriasMasFaltantes = Object.entries(categoriaStats)
          .map(([categoria, faltas]) => ({ categoria, faltas }))
          .sort((a, b) => b.faltas - a.faltas)
          .slice(0, 8)

        setStats({
          porZona,
          topVendedores,
          categoriasMasFaltantes,
          tendenciaActivacion: [] // Se puede implementar con datos históricos
        })
      }
    } catch (error) {
      console.error('Error loading admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="small" text="Cargando estadísticas..." />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Rendimiento por Zona */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Rendimiento por Zona
          </h3>
        </div>
        
        <div className="space-y-3">
          {stats.porZona.map((zona, index) => (
            <motion.div
              key={zona.zona}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Zona {zona.zona}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {zona.activados}/{zona.total} activados
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {zona.porcentaje}%
                </div>
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${zona.porcentaje}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
          
          {stats.porZona.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No hay datos disponibles
            </p>
          )}
        </div>
      </motion.div>

      {/* Top Vendedores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Vendedores
          </h3>
        </div>
        
        <div className="space-y-3">
          {stats.topVendedores.slice(0, 5).map((vendedor, index) => (
            <motion.div
              key={vendedor.vendedor_codigo}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {vendedor.vendedor_codigo}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {vendedor.activados}/{vendedor.total}
                  </p>
                </div>
              </div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {vendedor.porcentaje}%
              </div>
            </motion.div>
          ))}
          
          {stats.topVendedores.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No hay datos disponibles
            </p>
          )}
        </div>
      </motion.div>

      {/* Categorías más faltantes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Categorías Más Faltantes
          </h3>
        </div>
        
        <div className="space-y-3">
          {stats.categoriasMasFaltantes.map((categoria, index) => (
            <motion.div
              key={categoria.categoria}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
            >
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {categoria.categoria}
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                  {categoria.faltas} faltas
                </span>
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              </div>
            </motion.div>
          ))}
          
          {stats.categoriasMasFaltantes.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No hay datos disponibles
            </p>
          )}
        </div>
      </motion.div>

      {/* Resumen general */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card p-6"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Resumen General
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
              Zonas Activas
            </p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.porZona.length}
            </p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400 mb-1">
              Vendedores Activos
            </p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {stats.topVendedores.length}
            </p>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">
              Categorías con Faltas
            </p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {stats.categoriasMasFaltantes.length}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminStats
