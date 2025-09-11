import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, MapPin, Calendar } from 'lucide-react'

const ClienteCard = ({ cliente }) => {
  const [expanded, setExpanded] = useState(false)

  // Calcular estadísticas del cliente
  const stats = cliente.asignaciones.reduce((acc, asignacion) => {
    acc.total++
    if (asignacion.estado === 'ACTIVADO') acc.activados++
    else if (asignacion.estado === 'FALTA') acc.faltas++
    else acc.ceros++
    return acc
  }, { total: 0, activados: 0, faltas: 0, ceros: 0 })

  const porcentajeActivacion = stats.total > 0 ? Math.round((stats.activados / stats.total) * 100) : 0

  // Obtener información adicional del primer registro
  const primeraAsignacion = cliente.asignaciones[0]
  const ruta = primeraAsignacion?.ruta || ''
  const fechaReporte = primeraAsignacion?.fecha_reporte || ''

  return (
    <motion.div
      layout
      className="card overflow-hidden hover:shadow-lg transition-all duration-200"
    >
      {/* Header del cliente */}
      <div 
        className="p-6 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {cliente.cliente_nombre}
              </h3>
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                ID: {cliente.cliente_id}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              {ruta && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{ruta}</span>
                </div>
              )}
              {fechaReporte && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(fechaReporte).toLocaleDateString('es-ES')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Estadísticas rápidas */}
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {porcentajeActivacion}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {stats.activados}/{stats.total} activados
              </div>
            </div>

            {/* Indicador de expansión */}
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </motion.div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progreso de activación</span>
            <span>{stats.activados} de {stats.total}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${porcentajeActivacion}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>
      </div>

      {/* Detalles expandidos */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
              {/* Resumen de estados */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.activados}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Activados
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.faltas}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Faltas
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {stats.ceros}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Sin activar
                  </div>
                </div>
              </div>

              {/* Lista de categorías */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Categorías por Estado
                </h4>
                <div className="space-y-2">
                  {cliente.asignaciones.map((asignacion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-700 rounded-lg"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {asignacion.categorias?.categoria_nombre || 'Categoría'}
                      </span>
                      <span className={`chip ${
                        asignacion.estado === 'ACTIVADO' ? 'chip-activado' :
                        asignacion.estado === 'FALTA' ? 'chip-falta' : 'chip-cero'
                      }`}>
                        {asignacion.estado === 'ACTIVADO' ? 'Activado' :
                         asignacion.estado === 'FALTA' ? 'Falta' : 'Sin activar'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Categorías pendientes destacadas */}
              {stats.faltas > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Categorías Pendientes ({stats.faltas})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {cliente.asignaciones
                      .filter(a => a.estado === 'FALTA')
                      .map((asignacion, index) => (
                        <span key={index} className="chip-falta text-xs">
                          {asignacion.categorias?.categoria_nombre}
                        </span>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ClienteCard
