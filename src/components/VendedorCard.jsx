import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, User, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

const VendedorCard = ({ vendedor }) => {
  const [expanded, setExpanded] = useState(false)

  // Agrupar asignaciones por cliente
  const clientesAgrupados = vendedor.asignaciones.reduce((acc, asignacion) => {
    const clienteId = asignacion.cliente_id
    if (!acc[clienteId]) {
      acc[clienteId] = {
        cliente_id: clienteId,
        cliente_nombre: asignacion.clientes?.cliente_nombre || `Cliente ${clienteId}`,
        asignaciones: [],
        activados: 0,
        faltas: 0,
        ceros: 0
      }
    }
    acc[clienteId].asignaciones.push(asignacion)
    
    if (asignacion.estado === 'ACTIVADO') acc[clienteId].activados++
    else if (asignacion.estado === 'FALTA') acc[clienteId].faltas++
    else acc[clienteId].ceros++
    
    return acc
  }, {})

  const clientesList = Object.values(clientesAgrupados)

  return (
    <motion.div
      layout
      className="card overflow-hidden hover:shadow-lg transition-all duration-200"
    >
      {/* Header del vendedor */}
      <div 
        className="p-6 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {vendedor.nombre}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {vendedor.vendedor_codigo} • {vendedor.clientesUnicos} clientes
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Estadísticas principales */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {vendedor.activados}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Activados
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {vendedor.faltas}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Faltas
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {vendedor.porcentajeActivacion}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Activación
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
            <span>Progreso general</span>
            <span>{vendedor.activados} de {vendedor.asignaciones.length}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${vendedor.porcentajeActivacion}%` }}
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
              {/* Resumen por estado */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {vendedor.asignaciones.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total
                  </div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {vendedor.activados}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Activados
                  </div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {vendedor.faltas}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    Faltas
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                  <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                    {vendedor.asignaciones.length - vendedor.activados - vendedor.faltas}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Sin activar
                  </div>
                </div>
              </div>

              {/* Lista de clientes */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                  Clientes Asignados ({clientesList.length})
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {clientesList.map((cliente, index) => {
                    const porcentajeCliente = cliente.asignaciones.length > 0 ? 
                      Math.round((cliente.activados / cliente.asignaciones.length) * 100) : 0

                    return (
                      <motion.div
                        key={cliente.cliente_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              {cliente.cliente_nombre}
                            </h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {cliente.cliente_id} • {cliente.asignaciones.length} categorías
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {porcentajeCliente}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {cliente.activados}/{cliente.asignaciones.length}
                            </div>
                          </div>
                        </div>

                        {/* Barra de progreso del cliente */}
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-3">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${porcentajeCliente}%` }}
                          />
                        </div>

                        {/* Indicadores de estado */}
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            <span>{cliente.activados}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{cliente.faltas}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                            <div className="w-3 h-3 rounded-full bg-gray-400" />
                            <span>{cliente.ceros}</span>
                          </div>
                        </div>

                        {/* Categorías pendientes */}
                        {cliente.faltas > 0 && (
                          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                              Pendientes:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {cliente.asignaciones
                                .filter(a => a.estado === 'FALTA')
                                .slice(0, 3)
                                .map((asignacion, i) => (
                                  <span key={i} className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                                    {asignacion.categorias?.categoria_nombre}
                                  </span>
                                ))
                              }
                              {cliente.asignaciones.filter(a => a.estado === 'FALTA').length > 3 && (
                                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                  +{cliente.asignaciones.filter(a => a.estado === 'FALTA').length - 3} más
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default VendedorCard
