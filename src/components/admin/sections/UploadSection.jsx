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
  Download
} from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { adminService } from '../../../lib/supabase'

const UploadSection = () => {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [importMode, setImportMode] = useState('reemplazo') // 'reemplazo' o 'incremental'
  const [dateRange, setDateRange] = useState({
    fechaInicio: '',
    fechaFin: ''
  })

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

  const processFile = async (file) => {
    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        toast.error('El archivo está vacío')
        return
      }

      // Validar columnas requeridas
      const requiredColumns = ['SUPERVISOR', 'VENDEDOR', 'RUTA', 'CLIENTE', 'ENSURE', 'CHOCOLATE', 'ALPINA', 'SUPER DE ALIM.', 'CONDICIONATE']
      const fileColumns = Object.keys(jsonData[0])
      const missingColumns = requiredColumns.filter(col => !fileColumns.includes(col))

      if (missingColumns.length > 0) {
        toast.error(`Columnas faltantes: ${missingColumns.join(', ')}`)
        return
      }

      // Procesar y normalizar datos
      const processedData = jsonData.map((row, index) => {
        try {
          // Extraer código y nombre del vendedor
          const vendedorMatch = row.VENDEDOR.match(/^\s*([A-Za-z0-9]+)\s*-\s*(.+)$/)
          const vendedorCodigo = vendedorMatch ? vendedorMatch[1].trim() : ''
          const vendedorNombre = vendedorMatch ? vendedorMatch[2].trim() : row.VENDEDOR

          // Extraer código y nombre del cliente
          const clienteMatch = row.CLIENTE.match(/^(\d+)\s*-\s*(.+)$/)
          const clienteCodigo = clienteMatch ? clienteMatch[1] : ''
          const clienteNombre = clienteMatch ? clienteMatch[2].trim() : row.CLIENTE

          return {
            supervisor_codigo: extractCode(row.SUPERVISOR),
            supervisor_nombre: extractName(row.SUPERVISOR),
            vendedor_codigo: vendedorCodigo,
            vendedor_nombre: vendedorNombre,
            ruta_codigo: extractCode(row.RUTA),
            ruta_nombre: extractName(row.RUTA),
            cliente_codigo: clienteCodigo,
            cliente_nombre: clienteNombre,
            categorias: {
              ENSURE: normalizeEstado(row.ENSURE),
              CHOCOLATE: normalizeEstado(row.CHOCOLATE),
              ALPINA: normalizeEstado(row.ALPINA),
              SUPER_DE_ALIM: normalizeEstado(row['SUPER DE ALIM.'])
            },
            condicionate: row.CONDICIONATE,
            fila: index + 2
          }
        } catch (error) {
          console.error(`Error procesando fila ${index + 2}:`, error)
          return null
        }
      }).filter(Boolean)

      setPreviewData({
        original: jsonData.slice(0, 10), // Primeras 10 filas para preview
        processed: processedData, // TODOS los datos procesados, no solo 10
        totalRows: jsonData.length,
        validRows: processedData.length,
        errors: jsonData.length - processedData.length
      })

      toast.success(`Archivo procesado: ${processedData.length} registros válidos`)
    } catch (error) {
      console.error('Error processing file:', error)
      toast.error('Error al procesar el archivo')
    } finally {
      setLoading(false)
    }
  }

  const extractCode = (text) => {
    if (!text) return ''
    const match = text.match(/^([A-Za-z0-9]+)/)
    return match ? match[1] : ''
  }

  const extractName = (text) => {
    if (!text) return ''
    const match = text.match(/^[A-Za-z0-9]+\s*-\s*(.+)$/)
    return match ? match[1].trim() : text
  }

  const normalizeEstado = (value) => {
    if (!value || value === '0' || value === 0) return '0'
    if (value === 'Activado') return 'Activado'
    return '0'
  }

  const handleImport = async () => {
    if (!previewData) {
      toast.error('No hay datos para importar')
      return
    }

    if (importMode === 'reemplazo' && (!dateRange.fechaInicio || !dateRange.fechaFin)) {
      toast.error('Selecciona el rango de fechas para el modo reemplazo')
      return
    }

    setLoading(true)
    try {
      // Preparar datos para la importación
      const importData = []
      
      // Expandir datos por categoría
      previewData.processed.forEach(row => {
        Object.entries(row.categorias).forEach(([categoria, estado]) => {
          importData.push({
            supervisor_codigo: row.supervisor_codigo,
            supervisor_nombre: row.supervisor_nombre,
            vendedor_codigo: row.vendedor_codigo,
            vendedor_nombre: row.vendedor_nombre,
            ruta_codigo: row.ruta_codigo,
            ruta_nombre: row.ruta_nombre,
            cliente_codigo: row.cliente_codigo,
            cliente_nombre: row.cliente_nombre,
            categoria_codigo: categoria,
            categoria_nombre: categoria.replace('_', ' '),
            estado: estado,
            fecha: new Date().toISOString().split('T')[0]
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
          replaceMode && i === 0, // Solo reemplazar en el primer lote
          fechaInicio,
          fechaFin
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
