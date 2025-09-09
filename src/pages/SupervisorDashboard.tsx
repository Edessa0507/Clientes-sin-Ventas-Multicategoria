import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Users, TrendingUp, BarChart3, LogOut, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/LoadingSpinner'

interface SupervisorData {
  supervisor: {
    id: string
    codigo: string
    nombre: string
    zona: string
  }
  vendedores: Array<{
    id: string
    codigo: string
    nombre: string
    progreso: number
  }>
  kpis: {
    total_vendedores: number
    total_clientes: number
    progreso_zona: number
    clientes_activos: number
  }
}

export default function SupervisorDashboard() {
  const { user, logout } = useAuthStore()
  const [data, setData] = useState<SupervisorData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.id) return

      setIsLoading(true)
      setError(null)

      try {
        const { data: result, error: rpcError } = await supabase.rpc('get_supervisor_dashboard_data', {
          p_supervisor_id: user.id
        })

        if (rpcError) throw rpcError

        if (result?.error) {
          throw new Error(result.error)
        }

        setData(result)

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err)
        setError('No se pudieron cargar los datos. Intenta de nuevo más tarde.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

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
                Panel de Supervisor
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>{data?.supervisor.nombre || user?.nombre}</span>
                <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                  {data?.supervisor.codigo || user?.codigo}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Progreso Zona</p>
                  <p className="text-2xl font-bold text-success-600">
                    {data?.kpis.progreso_zona || 0}%
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clientes Activos</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {data?.kpis.clientes_activos || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Resumen por Vendedor</h2>
            <p className="card-description">
              Vista consolidada del progreso de activación por vendedor
            </p>
          </div>
          <div className="card-content">
            {data?.vendedores && data.vendedores.length > 0 ? (
              <div className="space-y-4">
                {data.vendedores.map((vendedor) => (
                  <div key={vendedor.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {vendedor.codigo} - {vendedor.nombre}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">
                        {vendedor.progreso}%
                      </p>
                      <p className="text-sm text-gray-500">Progreso</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No hay vendedores asignados</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
