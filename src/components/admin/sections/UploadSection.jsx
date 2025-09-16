import React, { useState, useCallback } from 'react'
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
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'

const UploadSection = () => {
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

    // Validar tamaño (máximo 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB permitido.')
      return
    }

    setFile(selectedFile)
    processFile(selectedFile)
  }

  const uploadToStorage = async (file) => {
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

      setProcessingStatus('Procesamiento completado')
      toast.success(processResult.message)
      
      // Load staging data for review
      await loadStagingData()
      
    } catch (error) {
      console.error('Error in upload process:', error)
      toast.error(error.message)
      setProcessingStatus(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadStagingData = async () => {
    try {
      const { data, error } = await supabase
        .from('asignaciones_staging')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw new Error(`Error cargando datos de staging: ${error.message}`)
      }

      setStagingData(data)
    } catch (error) {
      console.error('Error loading staging data:', error)
      toast.error(error.message)
    }
  }

  const promoteToProduction = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('promote_staging_to_production')
      
      if (error) {
        throw new Error(`Error promoviendo datos: ${error.message}`)
      }

      toast.success(`Datos promovidos exitosamente: ${data[0].message}`)
      setStagingData(null)
      setFile(null)
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
      setFile(null)
      setProcessingStatus(null)
      
    } catch (error) {
      console.error('Error clearing staging:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const processFile = async (file) => {
    // New server-side processing approach
    await uploadToStorage(file)
  }

  const clearFile = () => {
    setFile(null)
    setStagingData(null)
    setProcessingStatus(null)
  }
          })
        })
      })

      // Procesar en lotes para evitar timeout
      const batchSize = 100
      const batches = []
      
      for (let i = 0; i < importData.length; i += batchSize) {
        batches.push(importData.slice(i, i + batchSize))
      }
      
      let totalProcessed = 0
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        
        const result = await adminService.importExcelData(
          batch,
          importMode === 'reemplazo' && i === 0, // Solo reemplazar en el primer lote
          dateRange.fechaInicio,
          dateRange.fechaFin
        )
        
        if (result.error) {
          throw new Error(result.error)
        }
        
        totalProcessed += batch.length
        
        // Actualizar progreso
        toast.success(`Procesados ${totalProcessed} de ${importData.length} registros`)
        
        // Pausa pequeña entre lotes
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      toast.success(`Importación completada: ${importData.length} registros procesados`)
      // Limpiar formulario
      setFile(null)
      setPreviewData(null)
      setDateRange({ fechaInicio: '', fechaFin: '' })
    } catch (error) {
      console.error('Error importing data:', error)
      toast.error('Error al importar los datos')
    } finally {
      setLoading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreviewData(null)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Subir Archivo Excel
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Importar datos desde Excel. Sube un archivo Excel con los datos de clientes y categorías.
        </p>
      </div>

      {/* Configuración de importación */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configuración de Importación
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Agregar datos (incremental)
                </span>
              </label>
            </div>
          </div>

          {/* Rango de fechas (solo para modo reemplazo) */}
          {importMode === 'reemplazo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rango de Fechas a Eliminar
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.fechaInicio}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fechaInicio: e.target.value }))}
                  className="input-field"
                  placeholder="Fecha inicio"
                />
                <input
                  type="date"
                  value={dateRange.fechaFin}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fechaFin: e.target.value }))}
                  className="input-field"
                  placeholder="Fecha fin"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Área de carga de archivos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <FileSpreadsheet className="w-8 h-8 text-success-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={clearFile}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {loading && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Procesando archivo...
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Arrastra y suelta tu archivo Excel aquí
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  o haz clic para seleccionar un archivo
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <p className="text-xs text-gray-400">
                Formatos soportados: .xlsx, .xls, .csv (máximo 5MB)
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Vista previa de datos */}
      {previewData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vista Previa de Datos
            </h3>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-success-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {previewData.validRows} registros válidos
                </span>
              </span>
              {previewData.errors > 0 && (
                <span className="flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-warning-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {previewData.errors} errores
                  </span>
                </span>
              )}
              <span className="text-gray-600 dark:text-gray-400">
                Total: {previewData.totalRows} filas
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Supervisor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Vendedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Ensure
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Chocolate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Alpina
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Super Alim.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {previewData.processed.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {row.supervisor_nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {row.vendedor_nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {row.cliente_nombre}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        row.categorias.ENSURE === 'Activado' 
                          ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {row.categorias.ENSURE}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        row.categorias.CHOCOLATE === 'Activado' 
                          ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {row.categorias.CHOCOLATE}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        row.categorias.ALPINA === 'Activado' 
                          ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {row.categorias.ALPINA}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        row.categorias.SUPER_DE_ALIM === 'Activado' 
                          ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {row.categorias.SUPER_DE_ALIM}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewData.totalRows > 10 && (
            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Mostrando las primeras 10 filas de {previewData.totalRows} total
            </div>
          )}

          {/* Botón de importación */}
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={clearFile}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={loading || previewData.validRows === 0}
              className="btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Importar {previewData.validRows} registros</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default UploadSection
