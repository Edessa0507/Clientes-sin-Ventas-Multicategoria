import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, User, Shield, Settings, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUser } from '../../context/UserContext'
import { auth } from '../../lib/supabase'

const LoginPage = () => {
  const { login } = useUser()
  const [loginType, setLoginType] = useState('vendedor')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    codigo: '',
    email: '',
    password: ''
  })
  
  // Estado para autocompletado de nombre
  const [autocompletedName, setAutocompletedName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)

  // Configurar tema oscuro
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newDarkMode)
  }

  // Autocompletar nombre cuando se ingresa código
  useEffect(() => {
    const autocompleteName = async () => {
      if (formData.codigo && formData.codigo.length >= 2 && loginType !== 'admin') {
        setNameLoading(true)
        try {
          const name = await auth.getNameByCode(formData.codigo, loginType)
          setAutocompletedName(name || '')
        } catch (error) {
          setAutocompletedName('')
        } finally {
          setNameLoading(false)
        }
      } else {
        setAutocompletedName('')
      }
    }

    const timeoutId = setTimeout(autocompleteName, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.codigo, loginType])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const credentials = loginType === 'admin' 
        ? { email: formData.email, password: formData.password }
        : { codigo: formData.codigo }

      const result = await login(credentials, loginType)
      
      if (result.success) {
        toast.success(`¡Bienvenido${loginType === 'admin' ? ' Administrador' : ''}!`)
      } else {
        toast.error(result.error || 'Error al iniciar sesión')
      }
    } catch (error) {
      toast.error('Error inesperado al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const loginTypeConfig = {
    vendedor: {
      title: 'Vendedor',
      icon: User,
      color: 'primary',
      description: 'Accede con tu código de vendedor'
    },
    supervisor: {
      title: 'Supervisor',
      icon: Shield,
      color: 'success',
      description: 'Accede con tu código de supervisor'
    },
    admin: {
      title: 'Administrador',
      icon: Settings,
      color: 'warning',
      description: 'Accede con email y contraseña'
    }
  }

  const currentConfig = loginTypeConfig[loginType]
  const IconComponent = currentConfig.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-4 sm:px-6 lg:px-8">
      {/* Botón de tema */}
      <button
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 z-10"
      >
        {darkMode ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-4 sm:space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
              loginType === 'vendedor' 
                ? 'bg-blue-100 dark:bg-blue-900'
                : loginType === 'supervisor'
                ? 'bg-green-100 dark:bg-green-900'
                : 'bg-amber-100 dark:bg-amber-900'
            }`}
          >
            <IconComponent className={`h-8 w-8 ${
              loginType === 'vendedor' 
                ? 'text-blue-600 dark:text-blue-400'
                : loginType === 'supervisor'
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400'
            }`} />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Clientes sin Ventas
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {currentConfig.description}
          </p>
        </div>

        {/* Selector de tipo de usuario */}
        <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
          {Object.entries(loginTypeConfig).map(([type, config]) => {
            const Icon = config.icon
            return (
              <button
                key={type}
                onClick={() => {
                  setLoginType(type)
                  setFormData({ codigo: '', email: '', password: '' })
                  setAutocompletedName('')
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  loginType === type
                    ? type === 'vendedor' 
                      ? 'bg-blue-600 text-white shadow-sm'
                      : type === 'supervisor'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{config.title}</span>
              </button>
            )
          })}
        </div>

        {/* Formulario */}
        <motion.form
          key={loginType}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
        >
          <div className="card">
            <div className="space-y-4">
              {loginType === 'admin' ? (
                // Formulario para administrador
                <>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Correo electrónico
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="admin@empresa.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="input-field pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                // Formulario para vendedor/supervisor
                <>
                  <div>
                    <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Código de {currentConfig.title}
                    </label>
                    <input
                      id="codigo"
                      name="codigo"
                      type="text"
                      autoComplete="username"
                      required
                      value={formData.codigo}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder={loginType === 'supervisor' ? 'Email del supervisor' : 'Código del vendedor'}
                    />
                  </div>

                  {/* Autocompletado de nombre */}
                  {formData.codigo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border-l-4 border-primary-500"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          {nameLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600"></div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Verificando código...
                              </span>
                            </div>
                          ) : autocompletedName ? (
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {autocompletedName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                ¿Es correcto tu nombre?
                              </p>
                            </div>
                          ) : formData.codigo.length >= 2 ? (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              Código no encontrado o inactivo
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Botón de envío */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={loading || (loginType !== 'admin' && !autocompletedName)}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  loginType === 'vendedor' 
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    : loginType === 'supervisor'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  `Iniciar sesión como ${currentConfig.title}`
                )}
              </button>
            </div>
          </div>
        </motion.form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2024 EDESSA - Sistema de Gestión de Clientes
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage
