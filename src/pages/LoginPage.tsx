import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../stores/authStore'
import { Eye, EyeOff, User, Lock, Building2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

const loginSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido'),
  password: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.codigo.toLowerCase() === 'admin' && !data.password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La contraseña es requerida para el administrador',
      path: ['password']
    })
  }
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isAdminLogin, setIsAdminLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading, error, clearError } = useAuthStore()
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const codigoValue = watch('codigo')


  const onSubmit = async (data: LoginForm) => {
    clearError()
    const finalCodigo = isAdminLogin ? 'admin' : data.codigo
    await login(finalCodigo, data.password)
  }

  // Limpiar campos al cambiar de modo
  const handleLoginTypeChange = (isAdmin: boolean) => {
    setIsAdminLogin(isAdmin)
    setValue('codigo', '')
    setValue('password', '')
    clearError()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo y título */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Generador de Clientes
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            EDESSA - Sistema de Gestión Comercial
          </p>
        </div>

        {/* Formulario de login */}
        <div className="card animate-fade-in">
          <div className="card-content">
            {/* Toggle Admin/Vendedor */}
            <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 transition-all duration-300">
              <button
                type="button"
                onClick={() => handleLoginTypeChange(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                  !isAdminLogin
                    ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-lg scale-105'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Vendedor/Supervisor
              </button>
              <button
                type="button"
                onClick={() => handleLoginTypeChange(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                  isAdminLogin
                    ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-lg scale-105'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Administrador
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Campo código/email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isAdminLogin ? 'Email' : 'Código de Vendedor'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('codigo')}
                    type="text"
                    placeholder={isAdminLogin ? 'admin@edessa.com' : 'E001'}
                    className="input pl-10"
                  />
                </div>
                {errors.codigo && (
                  <p className="mt-1 text-sm text-error-600">{errors.codigo.message}</p>
                )}
              </div>


              {/* Campo contraseña (solo para admin) */}
              {isAdminLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="input pl-10 pr-10"
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
                  {errors.password && (
                    <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
                  )}
                </div>
              )}

              {/* Error general */}
              {error && (
                <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md p-3">
                  <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
                </div>
              )}

              {/* Botón de login */}
              <button
                type="submit"
                disabled={
                  isLoading || 
                  !codigoValue || 
                  codigoValue.trim().length === 0 ||
                  (isAdminLogin && (!watch('password') || watch('password')?.trim().length === 0))
                }
                className="btn-primary btn-lg w-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 disabled:transform-none disabled:hover:scale-100"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span className="animate-pulse">Iniciando sesión...</span>
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>

            {/* Información adicional */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isAdminLogin 
                  ? 'Acceso exclusivo para administradores del sistema'
                  : 'Ingresa tu código de vendedor para acceder a tu panel'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Información de la app */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>PWA Offline-First • Versión 1.0.0</p>
          <p className="mt-1">© 2024 EDESSA - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  )
}
