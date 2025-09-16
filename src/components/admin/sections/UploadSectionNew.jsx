import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Calendar,
  Database,
  Eye,
  Download,
  Server,
  Cloud,
  RefreshCw,
  Trash2,
  ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'

const UploadSectionNew = () => {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState(null)
  const [importMode, setImportMode] = useState('reemplazo') // 'reemplazo' o 'incremental'
  const [dateRange, setDateRange] = useState({
    fechaInicio: '',
    fechaFin: ''
  })
  const [stagingData, setStagingData] = useState(null)
  const [stagingStats, setStagingStats] = useState(null)

  useEffect(() => {
    checkStagingData()
  }, [])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return

    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV')
      return
    }

    // Validar tamaño (máximo 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 10MB permitido.')
      return
    }

    setFile(selectedFile)
  }

  const uploadToStorage = async () => {
    if (!file) {
      toast.error('Selecciona un archivo primero')
      return
    }

    if (importMode === 'reemplazo' && (!dateRange.fechaInicio || !dateRange.fechaFin)) {
      toast.error('Selecciona el rango de fechas para el modo reemplazo')
      return
    }

    setLoading(true)
    setUploadProgress(0)
    setProcessingStatus('Subiendo archivo...')
    
    try {
      // Generate unique filename
      const timestamp = new Date().getTime()
      const fileName = `excel-import-${timestamp}-${file.name}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('excel-imports')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw new Error(`Error subiendo archivo: ${error.message}`)
      }

      setUploadProgress(100)
      setProcessingStatus('Archivo subido, iniciando procesamiento...')
      
      // Call Edge Function to process the file
      const { data: processResult, error: processError } = await supabase.functions
        .invoke('process-excel', {
          body: {
            fileName: fileName,
            importMode: importMode,
            dateRange: importMode === 'reemplazo' ? dateRange : null
          }
        })

      if (processError) {
        throw new Error(`Error procesando archivo: ${processError.message}`)
      }

      if (!processResult.success) {
        throw new Error(processResult.error || 'Error desconocido en el procesamiento')
      }

      setProcessingStatus('Procesamiento completado exitosamente')
      toast.success(processResult.message)
      
      // Load staging data for review
      await checkStagingData()
      
      // Clear file selection
      setFile(null)
      setUploadProgress(0)
      
    } catch (error) {
      console.error('Error in upload process:', error)
      toast.error(error.message)
      setProcessingStatus(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkStagingData = async () => {
    try {
      // Get staging data count and sample
      const { data: stagingCount, error: countError } = await supabase
        .from('asignaciones_staging')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.error('Error getting staging count:', countError)
        return
      }

      if (stagingCount && stagingCount.length > 0) {
        // Get sample data
        const { data: sampleData, error: sampleError } = await supabase
          .from('asignaciones_staging')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (sampleError) {
          console.error('Error getting sample data:', sampleError)
          return
        }

        // Get statistics
        const { data: stats, error: statsError } = await supabase
          .from('asignaciones_staging')
          .select('supervisor_codigo, vendedor_codigo, cliente_codigo, categoria_codigo')

        if (!statsError && stats) {
          const supervisores = new Set(stats.map(s => s.supervisor_codigo)).size
          const vendedores = new Set(stats.map(s => s.vendedor_codigo)).size
          const clientes = new Set(stats.map(s => s.cliente_codigo)).size
          const categorias = new Set(stats.map(s => s.categoria_codigo)).size

          setStagingStats({
            totalRegistros: stats.length,
            supervisores,
            vendedores,
            clientes,
            categorias
          })
        }

        setStagingData(sampleData)
      } else {
        setStagingData(null)
        setStagingStats(null)
      }
    } catch (error) {
      console.error('Error checking staging data:', error)
    }
  }

  const promoteToProduction = async () => {
    if (!confirm('¿Estás seguro de que quieres promover los datos de staging a producción? Esta acción no se puede deshacer.')) {
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('promote_staging_to_production')
      
      if (error) {
        throw new Error(`Error promoviendo datos: ${error.message}`)
      }

      toast.success(`Datos promovidos exitosamente: ${data[0].message}`)
      setStagingData(null)
      setStagingStats(null)
      setProcessingStatus(null)
      
    } catch (error) {
      console.error('Error promoting to production:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const clearStagingData = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar todos los datos de staging? Esta acción no se puede deshacer.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('asignaciones_staging')
        .delete()
        .neq('id', 0) // Delete all records

      if (error) {
        throw new Error(`Error limpiando staging: ${error.message}`)
      }

      toast.success('Datos de staging eliminados')
      setStagingData(null)
      setStagingStats(null)
      setProcessingStatus(null)
      
    } catch (error) {
      console.error('Error clearing staging:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setProcessingStatus(null)
    setUploadProgress(0)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Importación Excel Avanzada
        </h2>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Sistema mejorado con procesamiento server-side, staging y validación robusta
        </p>
      </div>

      {/* Configuración de importación */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configuración de Importación
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Modo de importación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Modo de Importación
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importMode"
                  value="reemplazo"
                  checked={importMode === 'reemplazo'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  Reemplazar datos existentes
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importMode"
                  value="incremental"
                  checked={importMode === 'incremental'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  Agregar datos nuevos
                </span>
              </label>
            </div>
          </div>

          {/* Rango de fechas (solo para reemplazo) */}
          {importMode === 'reemplazo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rango de Fechas a Reemplazar
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.fechaInicio}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fechaInicio: e.target.value }))}
                  className="input text-sm"
                  placeholder="Fecha inicio"
                />
                <input
                  type="date"
                  value={dateRange.fechaFin}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fechaFin: e.target.value }))}
                  className="input text-sm"
                  placeholder="Fecha fin"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Área de subida */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 text-gray-400">
              {file ? (
                <FileSpreadsheet className="w-full h-full text-success-500" />
              ) : (
                <Upload className="w-full h-full" />
              )}
            </div>
            
            <div>
              <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                {file ? file.name : 'Arrastra tu archivo Excel aquí'}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {file 
                  ? `Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : 'o haz clic para seleccionar (máximo 10MB)'
                }
              </p>
            </div>

            {file && (
              <div className="flex justify-center space-x-3">
                <button
                  onClick={uploadToStorage}
                  disabled={loading}
                  className="btn-primary text-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4 mr-2" />
                      Procesar Archivo
                    </>
                  )}
                </button>
                <button
                  onClick={clearFile}
                  disabled={loading}
                  className="btn-secondary text-sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {loading && uploadProgress > 0 && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}% completado</p>
            </div>
          )}

          {/* Status */}
          {processingStatus && (
            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {processingStatus}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Staging Data Review */}
      {stagingData && stagingStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Datos en Staging - Listos para Promoción
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={promoteToProduction}
                disabled={loading}
                className="btn-primary text-sm"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Promover a Producción
              </button>
              <button
                onClick={clearStagingData}
                disabled={loading}
                className="btn-danger text-sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {stagingStats.totalRegistros.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Registros</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {stagingStats.supervisores}
              </div>
              <div className="text-xs text-gray-500">Supervisores</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {stagingStats.vendedores}
              </div>
              <div className="text-xs text-gray-500">Vendedores</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {stagingStats.clientes}
              </div>
              <div className="text-xs text-gray-500">Clientes</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {stagingStats.categorias}
              </div>
              <div className="text-xs text-gray-500">Categorías</div>
            </div>
          </div>

          {/* Sample Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Supervisor
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Vendedor
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Cliente
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Categoría
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {stagingData.slice(0, 10).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                      {row.supervisor_nombre}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                      {row.vendedor_nombre}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                      {row.cliente_nombre}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                      {row.categoria_nombre}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        row.estado === 'Activado' 
                          ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {row.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {stagingData.length > 10 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Mostrando 10 de {stagingStats.totalRegistros} registros
            </p>
          )}
        </motion.div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center">
            <Cloud className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                Procesamiento Server-Side
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Archivos procesados en el servidor para mayor eficiencia
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
            <Database className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                Staging & Validación
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Datos validados antes de ir a producción
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
            <CheckCircle className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                Transacciones Atómicas
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Importaciones seguras y consistentes
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default UploadSectionNew
