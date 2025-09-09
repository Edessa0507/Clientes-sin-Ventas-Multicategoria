import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Search, LogOut, User } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

interface Cliente {
  id: string
  nombre: string
  ruta: string
  categorias: {
    ensure: 'Activado' | 'Falta'
    chocolate: 'Activado' | 'Falta'
    alpina: 'Activado' | 'Falta'
    superAlim: 'Activado' | 'Falta'
  }
}

interface Ruta {
  id: string
  nombre: string
  clientesCount: number
}

export default function VendedorDashboard() {
  const { user, logout } = useAuthStore()
  const [selectedRuta, setSelectedRuta] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.id) return

      setIsLoading(true)
      setError(null)

      try {
        // Datos de ejemplo para desarrollo
        const mockRutas = [
          { id: 'ruta1', nombre: 'RUTA SANTIAGO CENTRO', clientesCount: 15 },
          { id: 'ruta2', nombre: 'RUTA SANTIAGO NORTE', clientesCount: 12 }
        ]

        const mockClientes = [
          {
            id: 'CLI001',
            nombre: 'SUPERMERCADO LA ECONOMIA',
            ruta: 'RUTA SANTIAGO CENTRO',
            categorias: {
              ensure: 'Activado' as const,
              chocolate: 'Falta' as const,
              alpina: 'Activado' as const,
              superAlim: 'Falta' as const
            }
          },
          {
            id: 'CLI002',
            nombre: 'COLMADO DONA MARIA',
            ruta: 'RUTA SANTIAGO CENTRO',
            categorias: {
              ensure: 'Falta' as const,
              chocolate: 'Activado' as const,
              alpina: 'Falta' as const,
              superAlim: 'Activado' as const
            }
          },
          {
            id: 'CLI003',
            nombre: 'MINIMARKET EL AHORRO',
            ruta: 'RUTA SANTIAGO NORTE',
            categorias: {
              ensure: 'Activado' as const,
              chocolate: 'Activado' as const,
              alpina: 'Falta' as const,
              superAlim: 'Falta' as const
            }
          }
        ]

        setRutas(mockRutas)
        setClientes(mockClientes)
        
        if (mockRutas.length > 0) {
          setSelectedRuta(mockRutas[0].id)
        }

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err)
        setError('No se pudieron cargar los datos. Intenta de nuevo más tarde.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  const handleLogout = async () => {
    await logout()
  }

  const filteredClientes = useMemo(() => clientes.filter(cliente => {
    const matchesRuta = !selectedRuta || cliente.ruta === selectedRuta
    const matchesSearch = !searchTerm || 
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.id.includes(searchTerm)
    return matchesRuta && matchesSearch
  }), [clientes, selectedRuta, searchTerm])

  // Calcular indicadores
  const totalClientes = filteredClientes.length
  const clientesConEnsure = filteredClientes.filter(c => c.categorias.ensure === 'Activado').length
  const clientesConChocolate = filteredClientes.filter(c => c.categorias.chocolate === 'Activado').length
  const clientesConAlpina = filteredClientes.filter(c => c.categorias.alpina === 'Activado').length
  const clientesConSuperAlim = filteredClientes.filter(c => c.categorias.superAlim === 'Activado').length

  const getCategoriaStyle = (status: string) => {
    switch (status) {
      case 'Activado':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Falta':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Panel de Vendedor
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.nombre} - {user?.codigo}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">
            {error}
          </div>
        ) : (
        <div className="px-4 py-6 sm:px-0">
          
          {/* Indicadores Principales */}
          {/* Indicadores Principales */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 text-center">
            <div className="card p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Clientes</h3>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{totalClientes}</p>
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ENSURE</h3>
              <p className="mt-1 text-2xl font-semibold text-green-600">{Math.round((clientesConEnsure / totalClientes) * 100) || 0}%</p>
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">CHOCOLATE</h3>
              <p className="mt-1 text-2xl font-semibold text-amber-600">{Math.round((clientesConChocolate / totalClientes) * 100) || 0}%</p>
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ALPINA</h3>
              <p className="mt-1 text-2xl font-semibold text-sky-600">{Math.round((clientesConAlpina / totalClientes) * 100) || 0}%</p>
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">SUPER DE ALIM.</h3>
              <p className="mt-1 text-2xl font-semibold text-indigo-600">{Math.round((clientesConSuperAlim / totalClientes) * 100) || 0}%</p>
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Progreso Total</h3>
              <p className="mt-1 text-2xl font-semibold text-purple-600">{Math.round(((clientesConEnsure + clientesConChocolate + clientesConAlpina + clientesConSuperAlim) / (totalClientes * 4)) * 100) || 0}%</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
            <div className="px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Selector de Ruta */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seleccionar Ruta
                  </label>
                  <select
                    value={selectedRuta}
                    onChange={(e) => setSelectedRuta(e.target.value)}
                    className="input"
                  >
                    <option value="">Todas las rutas</option>
                    {rutas.map(ruta => (
                      <option key={ruta.id} value={ruta.id}>
                        {ruta.nombre} ({ruta.clientesCount} clientes)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Búsqueda */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buscar Cliente
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Clientes */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Clientes y Categorías
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredClientes.length} clientes {selectedRuta && `en ruta ${selectedRuta}`}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ruta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ENSURE
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      CHOCOLATE
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ALPINA
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      SUPER DE ALIM.
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user?.codigo} - {user?.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cliente.ruta}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {cliente.id} - {cliente.nombre}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getCategoriaStyle(cliente.categorias.ensure)}`}>
                          {cliente.categorias.ensure}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getCategoriaStyle(cliente.categorias.chocolate)}`}>
                          {cliente.categorias.chocolate}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getCategoriaStyle(cliente.categorias.alpina)}`}>
                          {cliente.categorias.alpina}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getCategoriaStyle(cliente.categorias.superAlim)}`}>
                          {cliente.categorias.superAlim}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  )
}
