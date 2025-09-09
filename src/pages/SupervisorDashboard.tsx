import { useAuthStore } from '../stores/authStore'
import { Users, TrendingUp, BarChart3, LogOut, User } from 'lucide-react'

export default function SupervisorDashboard() {
  const { user, logout } = useAuthStore()

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vendedores</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
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
                  <p className="text-2xl font-bold text-success-600">78%</p>
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
                  <p className="text-2xl font-bold text-primary-600">156</p>
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
            <p className="text-gray-500">Dashboard de supervisor en desarrollo...</p>
          </div>
        </div>
      </main>
    </div>
  )
}
