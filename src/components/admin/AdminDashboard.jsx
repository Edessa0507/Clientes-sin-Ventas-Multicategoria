import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  FileSpreadsheet,
  Menu,
  X,
  Sun,
  Moon,
  MapPin,
  BookOpen
} from 'lucide-react'
import { useUser } from '../../context/UserContext'
import LoadingSpinner from '../ui/LoadingSpinner'
import DashboardSection from './sections/DashboardSection'
import UsersSection from './sections/UsersSection'
import UploadSectionNew from './sections/UploadSectionNew'
import GuideSection from './sections/GuideSection'
import RutasSection from './sections/RutasSection'

const AdminDashboard = () => {
  const { user, logout } = useUser()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('darkMode', JSON.stringify(newMode))
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Apply dark mode on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'rutas', label: 'Rutas', icon: MapPin },
    { id: 'upload', label: 'Importar Datos', icon: Upload },
    { id: 'guide', label: 'Guía de Uso', icon: BookOpen }
  ]

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection />
      case 'upload':
        return <UploadSectionNew />
      case 'users':
        return <UsersSection />
      case 'rutas':
        return <RutasSection />
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Botón hamburger - solo móvil */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-warning-100 dark:bg-warning-900 rounded-full flex items-center justify-center">
                  <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-warning-600 dark:text-warning-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    Panel Admin
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <span className="hidden sm:inline">Administrador • </span>
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Toggle modo oscuro */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={darkMode ? 'Modo claro' : 'Modo oscuro'}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              
              <button
                onClick={logout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Overlay para móvil */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className="lg:block">
          <motion.div
            initial={false}
            animate={{ x: sidebarOpen ? 0 : -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`
              fixed lg:relative lg:translate-x-0 z-30 lg:z-0
              w-64 sm:w-72 lg:w-64 xl:w-72
              bg-white dark:bg-gray-800 shadow-lg lg:shadow-sm 
              border-r border-gray-200 dark:border-gray-700 
              min-h-screen lg:min-h-0 h-full
              ${sidebarOpen ? 'block' : 'hidden lg:block'}
            `}
          >
            {/* Header del sidebar en móvil */}
            <div className="lg:hidden px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Navegación
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <nav className="mt-4 lg:mt-8 px-3 sm:px-4">
              <ul className="space-y-1 sm:space-y-2">
                {menuItems.map((section, index) => {
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
                        onClick={() => {
                          setActiveSection(section.id)
                          setSidebarOpen(false) // Cerrar sidebar en móvil
                        }}
                        className={`w-full flex items-center px-3 sm:px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-l-4 border-primary-500'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-500' : ''}`} />
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-medium truncate">{section.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {section.description}
                          </div>
                        </div>
                      </button>
                    </motion.li>
                  )
                })}
              </ul>
            </nav>

            {/* Sección activa en móvil */}
            <div className="lg:hidden mt-6 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                {(() => {
                  const activeSection_ = menuItems.find(s => s.id === activeSection)
                  const Icon = activeSection_?.icon || BarChart3
                  return (
                    <>
                      <Icon className="w-4 h-4 text-primary-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {activeSection_?.label}
                      </span>
                    </>
                  )
                })()}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 lg:ml-0">
          <main className="h-full overflow-y-auto">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-6 lg:p-8"
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
