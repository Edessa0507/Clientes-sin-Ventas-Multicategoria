import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Upload, FileSpreadsheet, Users, Database, LogOut, User, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'import' | 'users' | 'reports'>('import')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file)
        toast.success('Archivo seleccionado correctamente')
      } else {
        toast.error('Por favor selecciona un archivo Excel válido')
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      toast.success('Archivo seleccionado correctamente')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor selecciona un archivo')
      return
    }

    setIsUploading(true)
    const uploadToast = toast.loading('Subiendo y procesando archivo...')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No autenticado. Por favor, inicia sesión de nuevo.')
      }

      const { data, error } = await supabase.functions.invoke('apply-import', {
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast.success(`Importación completada: ${data.message}`, { id: uploadToast })
      setSelectedFile(null)
    } catch (error: any) {
      console.error('Error al importar:', error)
      toast.error(error.message || 'Error desconocido al importar el archivo.', { id: uploadToast })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Panel de Administración
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>{user?.nombre}</span>
                <span className="text-xs bg-error-100 text-error-800 px-2 py-1 rounded-full">
                  ADMIN
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
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('import')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'import'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 inline mr-2" />
              Importar Excel
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Gestión de Usuarios
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Database className="w-4 h-4 inline mr-2" />
              Reportes
            </button>
          </nav>
        </div>

        {/* Contenido de tabs */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Estadísticas de importación */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Última Importación</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">Hoy 14:30</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-success-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Registros Procesados</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">1,248</p>
                    </div>
                    <Database className="h-8 w-8 text-primary-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Errores</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">0</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-warning-500" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Estado</p>
                      <p className="text-lg font-bold text-success-600">Activo</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-success-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Área de carga de archivos */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Importar Datos Diarios</h2>
                <p className="card-description">
                  Sube el archivo Excel con los datos actualizados de clientes y categorías
                </p>
              </div>
              <div className="card-content">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  
                  {selectedFile ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Archivo seleccionado:
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                      <div className="flex justify-center space-x-2 mt-4">
                        <button
                          onClick={handleUpload}
                          disabled={isUploading}
                          className="btn-primary btn-md"
                        >
                          {isUploading ? 'Procesando...' : 'Importar Archivo'}
                        </button>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="btn-secondary btn-md"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Arrastra tu archivo Excel aquí
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        o haz clic para seleccionar
                      </p>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="btn-primary btn-md cursor-pointer inline-flex"
                      >
                        Seleccionar Archivo
                      </label>
                    </div>
                  )}
                </div>

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <p>• Formatos soportados: .xlsx, .xls</p>
                  <p>• Tamaño máximo: 10 MB</p>
                  <p>• Hoja esperada: "CLIENTES SIN VENT MULTICATEGORI"</p>
                </div>
              </div>
            </div>

            {/* Historial de importaciones */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Historial de Importaciones</h2>
              </div>
              <div className="card-content">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Archivo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Registros
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          2024-01-16 14:30
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          clientes_sin_ventas_2024_01_16.xlsx
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          1,248
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="badge-success">Completado</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          2024-01-15 09:15
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          clientes_sin_ventas_2024_01_15.xlsx
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          1,156
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="badge-success">Completado</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Gestión de Usuarios</h2>
              <p className="card-description">
                Administra vendedores, supervisores y otros usuarios del sistema
              </p>
            </div>
            <div className="card-content">
              <p className="text-gray-500">Módulo de gestión de usuarios en desarrollo...</p>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Reportes y Análisis</h2>
              <p className="card-description">
                Genera reportes de progreso y análisis de datos
              </p>
            </div>
            <div className="card-content">
              <p className="text-gray-500">Módulo de reportes en desarrollo...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
