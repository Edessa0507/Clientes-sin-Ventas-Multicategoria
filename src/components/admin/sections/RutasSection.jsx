import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  MapPin, 
  Route, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Database,
  Search,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { rutasService } from '../../../lib/supabase'

const RutasSection = () => {
  const [rutas, setRutas] = useState([])
  const [diagnostico, setDiagnostico] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDiagnostic, setShowDiagnostic] = useState(false)

  useEffect(() => {
    loadRutas()
    runDiagnostic()
  }, [])

  const loadRutas = async () => {
    setLoading(true)
    try {
      // Intentar cargar desde tabla rutas primero
      let result = await rutasService.getAllRutas()
      
      if (!result.data || result.data.length === 0) {
        // Si no hay rutas en tabla, cargar desde asignaciones
        result = await rutasService.getRutasFromAsignaciones()
      }
      
      if (result.data) {
        setRutas(result.data)
      } else {
        toast.error('Error al cargar rutas: ' + result.error)
      }
    } catch (error) {
      console.error('Error loading rutas:', error)
      toast.error('Error al cargar rutas')
    } finally {
      setLoading(false)
    }
  }

  const runDiagnostic = async () => {
    try {
      const result = await rutasService.diagnosticRutas()
      if (result.data) {
        setDiagnostico(result.data)
      }
    } catch (error) {
      console.error('Error running diagnostic:', error)
    }
  }

  const syncRutas = async () => {
    setLoading(true)
    try {
      const result = await rutasService.syncRutasFromAsignaciones()
      
      if (result.error && result.error.includes('No hay rutas')) {
        toast.error('No hay rutas en asignaciones para sincronizar')
      } else if (result.data) {
        toast.success(`${result.data.length} rutas sincronizadas exitosamente`)
        await loadRutas()
        await runDiagnostic()
      } else {
        toast.error('Error al sincronizar: ' + result.error)
      }
    } catch (error) {
      console.error('Error syncing rutas:', error)
      toast.error('Error al sincronizar rutas')
    } finally {
      setLoading(false)
    }
  }

  const filteredRutas = rutas.filter(ruta => 
    (ruta.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ruta.codigo || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Route className="w-6 h-6 text-primary-500" />
            Gestión de Rutas
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra y diagnostica las rutas del sistema
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowDiagnostic(!showDiagnostic)}
            className="btn-secondary flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Diagnóstico
          </button>
          <button
            onClick={syncRutas}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Diagnóstico Panel */}
      {showDiagnostic && diagnostico && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-500" />
            Diagnóstico del Sistema de Rutas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tabla Rutas</span>
                {diagnostico.tablaRutasExiste ? (
                  <CheckCircle className="w-5 h-5 text-success-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-error-500" />
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {diagnostico.tablaRutasExiste ? 'Existe' : 'No existe'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Rutas en Tabla</span>
                <MapPin className="w-5 h-5 text-primary-500" />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {diagnostico.totalRutasEnTabla || 0}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Rutas en Asignaciones</span>
                <Database className="w-5 h-5 text-info-500" />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {diagnostico.totalRutasEnAsignaciones || 0}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sin Ruta</span>
                <AlertTriangle className="w-5 h-5 text-warning-500" />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {diagnostico.asignacionesSinRuta || 0}
              </p>
            </div>
          </div>

          {diagnostico.muestraRutas && diagnostico.muestraRutas.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                Muestra de Rutas en Asignaciones:
              </h4>
              <div className="bg-gray-100 dark:bg-gray-600 p-3 rounded text-sm font-mono">
                {diagnostico.muestraRutas.map((ruta, index) => (
                  <div key={index} className="text-gray-700 dark:text-gray-300">
                    {ruta.ruta_codigo} - {ruta.ruta_nombre}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar rutas por código o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Rutas Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Cargando rutas...</p>
                  </td>
                </tr>
              ) : filteredRutas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <MapPin className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      {searchTerm ? 'No se encontraron rutas' : 'No hay rutas disponibles'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={syncRutas}
                        className="mt-2 text-primary-600 hover:text-primary-500 text-sm"
                      >
                        Sincronizar rutas desde asignaciones
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRutas.map((ruta, index) => (
                  <motion.tr
                    key={ruta.codigo || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {ruta.codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {ruta.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ruta.activa 
                          ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {ruta.activa ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activa
                          </>
                        ) : (
                          'Inactiva'
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {ruta.descripcion || 'Sin descripción'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          title="Editar ruta"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Eliminar ruta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      {filteredRutas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Estadísticas de Rutas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {filteredRutas.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total de Rutas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                {filteredRutas.filter(r => r.activa).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rutas Activas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {filteredRutas.filter(r => !r.activa).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rutas Inactivas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RutasSection
