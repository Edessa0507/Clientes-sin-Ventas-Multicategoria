import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Calendar, Eye } from 'lucide-react'
import { excel } from '../lib/excel'
import { db } from '../lib/supabase'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'

const ExcelImporter = ({ onImportComplete }) => {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState(null)
  const [fechaReporte, setFechaReporte] = useState(new Date().toISOString().split('T')[0])
  const [importing, setImporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Manejar drag & drop
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

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return

    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]

    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Tipo de archivo no válido. Use Excel (.xlsx, .xls) o CSV')
      return
    }

    // Validar tamaño (5MB máximo)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB')
      return
    }

    setFile(selectedFile)
    await processFile(selectedFile)
  }

  const processFile = async (fileToProcess) => {
    setProcessing(true)
    setProcessResult(null)

    try {
      const result = await excel.processFile(fileToProcess, fechaReporte)
      setProcessResult(result)
      
      if (result.success) {
        toast.success(`Archivo procesado: ${result.stats.processedRows} filas`)
      } else {
        toast.error(`Errores encontrados: ${result.errors.length}`)
      }
    } catch (error) {
      toast.error(`Error procesando archivo: ${error.message}`)
      setProcessResult({ success: false, error: error.message })
    } finally {
      setProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!processResult?.success) return

    setImporting(true)
    try {
      const { data } = processResult

      // 1. Upsert categorías
      const { error: catError } = await db.upsertCategorias(data.categorias)
      if (catError) throw catError

      // 2. Upsert clientes
      const { error: clientError } = await db.upsertClientes(data.clientes)
      if (clientError) throw clientError

      // 3. Reemplazar asignaciones por fecha
      const { error: assignError } = await db.replaceAsignacionesByFecha(
        fechaReporte, 
        data.asignaciones
      )
      if (assignError) throw assignError

      toast.success(`Importación completada: ${data.asignaciones.length} asignaciones`)
      
      // Limpiar estado
      setFile(null)
      setProcessResult(null)
      setShowPreview(false)
      
      // Notificar al componente padre
      onImportComplete?.()
      
    } catch (error) {
      toast.error(`Error en importación: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }

  const resetImporter = () => {
    setFile(null)
    setProcessResult(null)
    setShowPreview(false)
    setProcessing(false)
    setImporting(false)
  }

  return (
    <div className="space-y-6">
      {/* Selector de fecha */}
      <div className="card p-4">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex-1">
            <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha del Reporte
            </label>
            <input
              id="fecha"
              type="date"
              value={fechaReporte}
              onChange={(e) => setFechaReporte(e.target.value)}
              className="input-field max-w-xs"
            />
          </div>
        </div>
      </div>

      {/* Área de carga de archivo */}
      <div className="card p-6">
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            dragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
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
            disabled={processing || importing}
          />

          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-500" />
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {dragActive ? 'Suelta el archivo aquí' : 'Arrastra tu archivo Excel aquí'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                o haz clic para seleccionar un archivo (.xlsx, .xls, .csv)
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Máximo 5MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Archivo seleccionado */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              <button
                onClick={resetImporter}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={processing || importing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estado de procesamiento */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="card p-6"
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="spinner" />
              <span className="text-gray-600 dark:text-gray-400">
                Procesando archivo...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultado del procesamiento */}
      <AnimatePresence>
        {processResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Resumen */}
            <div className={`card p-4 border-l-4 ${
              processResult.success 
                ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' 
                : 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center space-x-3">
                {processResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-500" />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {processResult.success ? 'Archivo procesado correctamente' : 'Errores encontrados'}
                  </h3>
                  {processResult.stats && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {processResult.stats.processedRows} filas procesadas • {' '}
                      {processResult.stats.uniqueClientes} clientes • {' '}
                      {processResult.stats.uniqueCategorias} categorías • {' '}
                      {processResult.stats.uniqueVendedores} vendedores
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Errores */}
            {processResult.errors && processResult.errors.length > 0 && (
              <div className="card p-4">
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-3">
                  Errores encontrados ({processResult.errors.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {processResult.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <span className="font-medium">Fila {error.row}:</span> {error.error}
                    </div>
                  ))}
                  {processResult.errors.length > 10 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ... y {processResult.errors.length - 10} errores más
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            {processResult.success && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>{showPreview ? 'Ocultar' : 'Ver'} Vista Previa</span>
                </button>

                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="btn-success flex items-center space-x-2"
                >
                  {importing ? (
                    <>
                      <div className="spinner" />
                      <span>Importando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Aplicar Importación</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vista previa */}
      <AnimatePresence>
        {showPreview && processResult?.success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Vista Previa de Datos
            </h3>
            
            <div className="space-y-6">
              {/* Clientes */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Clientes ({processResult.data.clientes.length})
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {processResult.data.clientes.slice(0, 5).map(cliente => (
                    <div key={cliente.cliente_id} className="text-sm py-1">
                      <span className="font-mono text-primary-600 dark:text-primary-400">
                        {cliente.cliente_id}
                      </span>
                      {' - '}
                      <span>{cliente.cliente_nombre}</span>
                    </div>
                  ))}
                  {processResult.data.clientes.length > 5 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 pt-1">
                      ... y {processResult.data.clientes.length - 5} más
                    </div>
                  )}
                </div>
              </div>

              {/* Categorías */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categorías ({processResult.data.categorias.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {processResult.data.categorias.map(categoria => (
                    <span key={categoria.categoria_id} className="chip-cero">
                      {categoria.categoria_nombre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Vendedores */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vendedores ({processResult.data.vendedores.length})
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {processResult.data.vendedores.map(vendedor => (
                    <div key={vendedor.vendedor_codigo} className="text-sm py-1">
                      <span className="font-mono text-primary-600 dark:text-primary-400">
                        {vendedor.vendedor_codigo}
                      </span>
                      {' - '}
                      <span>{vendedor.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ExcelImporter
