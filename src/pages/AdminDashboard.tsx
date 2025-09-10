import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { 
  Users, 
  TrendingUp, 
  BarChart3, 
  LogOut, 
  User, 
  Upload, 
  FileText, 
  CheckCircle,
  XCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/LoadingSpinner'
import * as XLSX from 'xlsx'

interface AdminData {
  kpis: {
    total_zonas: number
    total_vendedores: number
    total_supervisores: number
    total_clientes: number
    progreso_global: number
    ultima_importacion: string
  }
  zonas: Array<{
    id: string
    nombre: string
    vendedores: number
    clientes: number
    progreso: number
  }>
  import_history: Array<{
    id: string
    fecha: string
    archivo: string
    filas: number
    estado: string
    usuario: string
  }>
}

interface UploadStatus {
  isUploading: boolean
  progress: number
  message: string
  error: string | null
  success: boolean
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const [data, setData] = useState<AdminData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    message: '',
    error: null,
    success: false
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.id) return

      setIsLoading(true)
      setError(null)

      try {
        // Datos mock para desarrollo hasta que las funciones RPC estén disponibles
        const mockData = {
          kpis: {
            total_zonas: 3,
            total_vendedores: 12,
            total_supervisores: 3,
            total_clientes: 75,
            progreso_global: 82,
            ultima_importacion: new Date().toISOString()
          },
          zonas: [
            {
              id: 'z1',
              nombre: 'ZONA SANTIAGO',
              vendedores: 4,
              clientes: 25,
              progreso: 85
            },
            {
              id: 'z2',
              nombre: 'ZONA SANTO DOMINGO',
              vendedores: 4,
              clientes: 30,
              progreso: 78
            },
            {
              id: 'z3',
              nombre: 'ZONA SANTIAGO RODRIGUEZ',
              vendedores: 4,
              clientes: 20,
              progreso: 90
            }
          ],
          import_history: [
            {
              id: 'i1',
              fecha: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              archivo: 'datos_2024_01_15.xlsx',
              filas: 150,
              estado: 'completado',
              usuario: 'GUSTAVO REYES'
            },
            {
              id: 'i2',
              fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              archivo: 'datos_2024_01_14.xlsx',
              filas: 145,
              estado: 'completado',
              usuario: 'GUSTAVO REYES'
            },
            {
              id: 'i3',
              fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              archivo: 'datos_2024_01_13.xlsx',
              filas: 140,
              estado: 'completado',
              usuario: 'GUSTAVO REYES'
            }
          ]
        }

        setData(mockData)

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err)
        setError('No se pudieron cargar los datos. Intenta de nuevo más tarde.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadStatus({
      isUploading: true,
      progress: 0,
      message: 'Procesando archivo...',
      error: null,
      success: false
    })

    try {
      // Leer archivo Excel
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      // Convertir a formato esperado
      const headers = jsonData[0] as string[]
      const rows = jsonData.slice(1) as any[][]
      
      const processedData = rows.map(row => {
        const obj: any = {}
        headers.forEach((header, index) => {
          if (header) {
            // Normalizar nombres de columnas
            let normalizedHeader = header.toString().trim()
            
            // Mapear nombres específicos conocidos con mayor flexibilidad
            const headerUpper = normalizedHeader.toUpperCase()
            
            if (headerUpper.includes('VENDEDOR')) {
              normalizedHeader = 'vendedor'
            } else if (headerUpper.includes('CLIENTE')) {
              normalizedHeader = 'cliente'
            } else if (headerUpper.includes('SUPERVISOR')) {
              normalizedHeader = 'supervisor'
            } else if (headerUpper.includes('RUTA')) {
              normalizedHeader = 'ruta'
            } else if (headerUpper.includes('ENSURE')) {
              normalizedHeader = 'ensure'
            } else if (headerUpper.includes('CHOCOLATE')) {
              normalizedHeader = 'chocolate'
            } else if (headerUpper.includes('ALPINA')) {
              normalizedHeader = 'alpina'
            } else if (headerUpper.includes('SUPER DE ALIM') || headerUpper.includes('SUPER DE ALIM.')) {
              normalizedHeader = 'super_de_alim'
            } else if (headerUpper.includes('CONDICIONATE')) {
              normalizedHeader = 'condicionate'
            } else {
              // Conversión genérica para otros casos
              normalizedHeader = normalizedHeader.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            }
            
            const cell = row[index]
            obj[normalizedHeader] = (cell === undefined || cell === null) ? '' : cell.toString().trim()
          }
        })
        return obj
      })

      // Validar que tenemos los datos mínimos requeridos
      const requiredColumns = ['vendedor', 'cliente']
      const missingColumns = requiredColumns.filter(col => 
        !processedData.some(row => row[col] && row[col].toString().trim() !== '')
      )
      
      if (missingColumns.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${missingColumns.join(', ')}`)
      }

      // Filtrar filas vacías
      const validData = processedData.filter(row => 
        row.vendedor && row.cliente && 
        row.vendedor.toString().trim() !== '' && 
        row.cliente.toString().trim() !== ''
      )

      if (validData.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo')
      }

      console.log(`Datos procesados: ${processedData.length} filas, ${validData.length} válidas`)
      console.log('Primera fila de ejemplo:', validData[0])

      setUploadStatus(prev => ({ ...prev, progress: 30, message: 'Enviando datos al servidor...' }))

      // Enviar datos a la Edge Function
      const { data: result, error: uploadError } = await supabase.functions.invoke('excel-upload', {
        method: 'POST',
        body: {
          usuario_id: user?.id,
          nombre_archivo: file.name,
          datos: validData
        }
      })

      if (uploadError) throw uploadError

      if (!result.success) {
        throw new Error(result.error || 'Error al procesar el archivo')
      }

      // Mostrar información de debug si está disponible
      let debugMessage = `Datos procesados exitosamente. ${result.filas_insertadas || 0} registros insertados.`;
      
      if (result.debug_info) {
        debugMessage += `\n\nDebug Info:`;
        debugMessage += `\n- Vendedores procesados: ${result.debug_info.vendedores_procesados || 0}`;
        debugMessage += `\n- Clientes procesados: ${result.debug_info.clientes_procesados || 0}`;
        debugMessage += `\n- Categorías procesadas: ${result.debug_info.categorias_procesadas || 0}`;
        debugMessage += `\n- Asignaciones insertadas: ${result.debug_info.asignaciones_insertadas || 0}`;
        debugMessage += `\n- Fecha de reporte: ${result.debug_info.fecha_reporte || 'N/A'}`;
        debugMessage += `\n- Filas con errores: ${result.debug_info.filas_con_errores || 0}`;
        debugMessage += `\n- Filas procesadas exitosamente: ${result.debug_info.filas_procesadas_exitosas || 0}`;
        debugMessage += `\n- Vendedores creados: ${result.debug_info.vendedores_creados || 0}`;
        debugMessage += `\n- Clientes creados: ${result.debug_info.clientes_creados || 0}`;
        
        if (result.debug_info.primera_fila_ejemplo) {
          debugMessage += `\n\nPrimera fila del Excel:`;
          debugMessage += `\n- Vendedor: "${result.debug_info.primera_fila_ejemplo.vendedor}"`;
          debugMessage += `\n- Cliente: "${result.debug_info.primera_fila_ejemplo.cliente}"`;
        }
      }

      setUploadStatus(prev => ({
        ...prev,
        progress: 100,
        message: debugMessage,
        success: true,
        isUploading: false
      }))

      // Recargar datos del dashboard
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (err: any) {
      console.error('Error uploading file:', err)
      
      let errorMessage = 'Error al procesar el archivo';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Mensajes más específicos para errores comunes
      if (errorMessage.includes('Edge Function returned a non-2xx status code')) {
        errorMessage = 'Error del servidor. Por favor, verifica que el archivo tenga el formato correcto y vuelve a intentar.';
      } else if (errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
      } else if (errorMessage.includes('Datos requeridos faltantes')) {
        errorMessage = 'El archivo no contiene los datos necesarios. Verifica que tenga las columnas correctas.';
      }
      
      setUploadStatus(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
        success: false
      }))
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Panel de Administrador
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>{user?.nombre}</span>
                <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                  {user?.codigo}
                </span>
              </div>
              
              <button
                onClick={logout}
                className="btn-secondary btn-sm flex items-center space-x-1"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Zonas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data?.kpis.total_zonas || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary-600" />
              </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vendedores</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data?.kpis.total_vendedores || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary-600" />
              </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Progreso Global</p>
                  <p className="text-2xl font-bold text-success-600">
                    {data?.kpis.progreso_global || 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success-600" />
              </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clientes</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {data?.kpis.total_clientes || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary-600" />
              </div>
                </div>
              </div>
            </div>

        {/* Carga de Archivos Excel */}
        <div className="card mb-8">
              <div className="card-header">
            <h2 className="card-title">Carga de Datos Diarios</h2>
                <p className="card-description">
              Sube el archivo Excel diario para actualizar los datos del sistema
                </p>
              </div>
              <div className="card-content">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Seleccionar archivo Excel
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  El archivo debe contener las columnas: SUPERVISOR, VENDEDOR, RUTA, CLIENTE, ENSURE, CHOCOLATE, ALPINA, SUPER DE ALIM., CONDICIONATE
                </p>
                <button
                  onClick={triggerFileUpload}
                  disabled={uploadStatus.isUploading}
                  className="btn-primary"
                >
                  {uploadStatus.isUploading ? 'Procesando...' : 'Seleccionar Archivo'}
                        </button>
                      <input
                  ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                        className="hidden"
                />
              </div>

              {uploadStatus.isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-600">{uploadStatus.message}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadStatus.progress}%` }}
                    />
                    </div>
                </div>
              )}

              {uploadStatus.error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <XCircle className="h-5 w-5" />
                  <span className="text-sm">{uploadStatus.error}</span>
                </div>
              )}

              {uploadStatus.success && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">{uploadStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resumen por Zonas */}
        <div className="card mb-8">
            <div className="card-header">
            <h2 className="card-title">Resumen por Zonas</h2>
              <p className="card-description">
              Progreso de activación por zona geográfica
              </p>
            </div>
            <div className="card-content">
            {data?.zonas && data.zonas.length > 0 ? (
              <div className="space-y-4">
                {data.zonas.map((zona) => (
                  <div key={zona.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{zona.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {zona.vendedores} vendedores • {zona.clientes} clientes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">{zona.progreso}%</p>
                      <p className="text-sm text-gray-500">Progreso</p>
                    </div>
                  </div>
                ))}
            </div>
            ) : (
              <p className="text-gray-500">No hay datos de zonas disponibles</p>
            )}
          </div>
        </div>

        {/* Historial de Importaciones */}
          <div className="card">
            <div className="card-header">
            <h2 className="card-title">Historial de Importaciones</h2>
              <p className="card-description">
              Últimas cargas de datos realizadas
              </p>
            </div>
            <div className="card-content">
            {data?.import_history && data.import_history.length > 0 ? (
              <div className="space-y-3">
                {data.import_history.map((importacion) => (
                  <div key={importacion.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{importacion.archivo}</p>
                        <p className="text-sm text-gray-500">
                          {importacion.usuario} • {new Date(importacion.fecha).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{importacion.filas} filas</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        importacion.estado === 'completado' 
                          ? 'bg-green-100 text-green-800' 
                          : importacion.estado === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {importacion.estado}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            ) : (
              <p className="text-gray-500">No hay historial de importaciones</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}