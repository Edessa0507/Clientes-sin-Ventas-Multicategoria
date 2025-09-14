import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  LogOut, 
  BarChart3, 
  Upload, 
  Users, 
  HelpCircle,
  TrendingUp,
  Database,
  Calendar,
  FileSpreadsheet
} from 'lucide-react'
import { useUser } from '../../context/UserContext'
import LoadingSpinner from '../ui/LoadingSpinner'
import DashboardSection from './sections/DashboardSection'
import UploadSection from './sections/UploadSection'
import UsersSection from './sections/UsersSection'
import GuideSection from './sections/GuideSection'

const AdminDashboard = () => {
  const { user, logout } = useUser()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [loading, setLoading] = useState(false)

  const sections = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: BarChart3,
      description: 'Métricas y estadísticas generales'
    },
    {
      id: 'upload',
      name: 'Subir Archivo',
      icon: Upload,
      description: 'Importar datos desde Excel'
    },
    {
      id: 'users',
      name: 'Usuarios',
      icon: Users,
      description: 'Administrar usuarios del sistema'
    },
    {
      id: 'guide',
      name: 'Guía de Uso',
      icon: HelpCircle,
      description: 'Manual interactivo de la aplicación'
    }
  ]

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection />
      case 'upload':
        return <UploadSection />
      case 'users':
        return <UsersSection />
      case 'guide':
        return <GuideSection />
      default:
        return <DashboardSection />
    }
  }

  if (loading) {
    return <LoadingSpinner text="Cargando panel de administración..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900 rounded-full flex items-center justify-center">
                  <Settings className="w-6 h-6 text-warning-600 dark:text-warning-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Panel de Administración
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Administrador • {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 min-h-screen">
          <nav className="mt-8 px-4">
            <ul className="space-y-2">
              {sections.map((section, index) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                
                return (
                  <motion.li
                    key={section.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-l-4 border-primary-500'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : ''}`} />
                      <div className="text-left">
                        <div className="font-medium">{section.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {section.description}
                        </div>
                      </div>
                    </button>
                  </motion.li>
                )
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <main className="h-full overflow-y-auto">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-8"
            >
              {renderActiveSection()}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
