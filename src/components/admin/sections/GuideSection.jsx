import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HelpCircle, 
  ChevronRight, 
  ChevronDown, 
  User, 
  Shield, 
  Settings, 
  Upload, 
  BarChart3, 
  CheckCircle,
  Play,
  Book,
  Video,
  Download
} from 'lucide-react'

const GuideSection = () => {
  const [activeSection, setActiveSection] = useState('overview')
  const [expandedItems, setExpandedItems] = useState({})

  const guideData = {
    overview: {
      title: 'Visión General',
      icon: Book,
      content: {
        description: 'Bienvenido al sistema de gestión de clientes sin ventas multicategoría. Esta aplicación te permite administrar y monitorear el estado de activación de productos por cliente.',
        features: [
          'Dashboard interactivo con métricas en tiempo real',
          'Gestión de usuarios con tres roles diferentes',
          'Importación masiva de datos desde Excel',
          'Funcionalidad offline para trabajo sin conexión',
          'Reportes y estadísticas detalladas'
        ],
        roles: [
          {
            name: 'Vendedor',
            icon: User,
            description: 'Ve sus clientes asignados y el estado de cada categoría de producto',
            access: ['Dashboard personal', 'Lista de clientes', 'Estados de categorías']
          },
          {
            name: 'Supervisor',
            icon: Shield,
            description: 'Supervisa el rendimiento de sus vendedores asignados',
            access: ['Dashboard de equipo', 'Estadísticas por vendedor', 'Filtros comparativos']
          },
          {
            name: 'Administrador',
            icon: Settings,
            description: 'Acceso completo al sistema y gestión de datos',
            access: ['Dashboard global', 'Importación de datos', 'Gestión de usuarios', 'Reportes avanzados']
          }
        ]
      }
    },
    login: {
      title: 'Inicio de Sesión',
      icon: User,
      content: {
        description: 'El sistema maneja tres tipos de autenticación según el rol del usuario.',
        steps: [
          {
            title: 'Vendedores y Supervisores',
            details: [
              'Ingresa tu código de usuario (ej: E56, SUP001)',
              'El sistema autocompletará tu nombre para verificación',
              'Confirma que el nombre mostrado es correcto',
              'Haz clic en "Iniciar sesión"'
            ]
          },
          {
            title: 'Administradores',
            details: [
              'Selecciona la pestaña "Administrador"',
              'Ingresa tu correo electrónico',
              'Ingresa tu contraseña',
              'Haz clic en "Iniciar sesión como Administrador"'
            ]
          }
        ],
        tips: [
          'Si tu código no es reconocido, verifica que esté activo en el sistema',
          'El autocompletado funciona después de ingresar al menos 2 caracteres',
          'Puedes cambiar entre modo claro y oscuro usando el botón en la esquina superior'
        ]
      }
    },
    vendedor: {
      title: 'Panel del Vendedor',
      icon: User,
      content: {
        description: 'Como vendedor, puedes ver todos tus clientes asignados y el estado de activación de cada categoría de producto.',
        sections: [
          {
            title: 'Estadísticas Principales',
            items: [
              'Total de clientes asignados',
              'Clientes totalmente activados (4/4 categorías)',
              'Clientes con faltantes',
              'Porcentaje de activación general'
            ]
          },
          {
            title: 'Filtros Disponibles',
            items: [
              'Búsqueda por nombre o código de cliente',
              'Filtro por estado: Todos, Activado, Con FALTA, Sin activación',
              'Filtro por categoría específica: Ensure, Chocolate, Alpina, Super de Alim.'
            ]
          },
          {
            title: 'Estados de Categorías',
            items: [
              'Activado: Producto activado para el cliente',
              'FALTA: Cliente tiene algunas categorías activadas pero no todas',
              '0: Producto no activado'
            ]
          }
        ],
        offline: 'El panel funciona sin conexión mostrando los últimos datos sincronizados. Cuando recuperes la conexión, los datos se actualizarán automáticamente.'
      }
    },
    supervisor: {
      title: 'Panel del Supervisor',
      icon: Shield,
      content: {
        description: 'Como supervisor, puedes monitorear el rendimiento de todos los vendedores bajo tu supervisión.',
        sections: [
          {
            title: 'Vista General',
            items: [
              'Estadísticas consolidadas de tu equipo',
              'Total de vendedores, clientes y activaciones',
              'Porcentaje de activación del equipo'
            ]
          },
          {
            title: 'Filtros de Vendedores',
            items: [
              'Selecciona vendedores individuales o múltiples',
              'Compara el rendimiento entre vendedores',
              'Botones "Todos" y "Ninguno" para selección rápida'
            ]
          },
          {
            title: 'Tabla de Rendimiento',
            items: [
              'Rendimiento individual por vendedor',
              'Número de clientes asignados',
              'Clientes totalmente activados',
              'Porcentaje de activación con barra visual',
              'Total de activaciones por categoría'
            ]
          }
        ],
        tips: [
          'Usa los filtros para identificar vendedores que necesitan apoyo',
          'La barra de progreso te da una vista rápida del rendimiento',
          'Los datos se actualizan automáticamente cuando hay conexión'
        ]
      }
    },
    admin: {
      title: 'Panel de Administración',
      icon: Settings,
      content: {
        description: 'El panel de administración te da control total sobre el sistema.',
        sections: [
          {
            title: 'Dashboard Principal',
            items: [
              'Métricas globales del sistema',
              'Gráficos de rendimiento por zona',
              'Top vendedores del período',
              'Historial de importaciones'
            ]
          },
          {
            title: 'Subir Archivo',
            items: [
              'Importación masiva desde Excel',
              'Modo reemplazo o incremental',
              'Vista previa antes de importar',
              'Validación automática de datos'
            ]
          },
          {
            title: 'Gestión de Usuarios',
            items: [
              'Crear, editar y eliminar usuarios',
              'Asignar roles y permisos',
              'Activar/desactivar cuentas',
              'Monitorear último acceso'
            ]
          }
        ]
      }
    },
    upload: {
      title: 'Importación de Excel',
      icon: Upload,
      content: {
        description: 'Guía paso a paso para importar datos desde archivos Excel.',
        steps: [
          {
            title: 'Preparar el Archivo',
            details: [
              'Asegúrate de que el Excel tenga las columnas requeridas:',
              'SUPERVISOR, VENDEDOR, RUTA, CLIENTE, ENSURE, CHOCOLATE, ALPINA, SUPER DE ALIM., CONDICIONATE',
              'Los datos deben estar en la primera hoja del archivo',
              'Formato máximo: 5MB'
            ]
          },
          {
            title: 'Configurar la Importación',
            details: [
              'Selecciona el modo de importación:',
              '• Reemplazo: Elimina datos existentes del rango de fechas seleccionado',
              '• Incremental: Agrega nuevos datos sin eliminar existentes',
              'Para modo reemplazo, especifica las fechas de inicio y fin'
            ]
          },
          {
            title: 'Subir y Validar',
            details: [
              'Arrastra el archivo o haz clic para seleccionarlo',
              'El sistema validará automáticamente el formato',
              'Revisa la vista previa de los datos procesados',
              'Verifica que no haya errores en el procesamiento'
            ]
          },
          {
            title: 'Confirmar Importación',
            details: [
              'Revisa el resumen de registros a procesar',
              'Haz clic en "Importar" para confirmar',
              'El proceso puede tomar varios minutos para archivos grandes',
              'Recibirás una notificación al completarse'
            ]
          }
        ],
        formats: {
          title: 'Formato de Datos Esperado',
          example: [
            'SUPERVISOR: CARLOS VALDEZ (Sto. Dom.)',
            'VENDEDOR: E56 - (PREV) PEDRO JOSE BURGOS',
            'RUTA: 1L - Lunes 1x',
            'CLIENTE: 61842 - CASA NANDO',
            'ENSURE: 0 o Activado',
            'CHOCOLATE: 0 o Activado',
            'ALPINA: 0 o Activado',
            'SUPER DE ALIM.: 0 o Activado',
            'CONDICIONATE: FALTA o Activado'
          ]
        }
      }
    },
    troubleshooting: {
      title: 'Solución de Problemas',
      icon: HelpCircle,
      content: {
        description: 'Soluciones a problemas comunes que puedes encontrar.',
        problems: [
          {
            title: 'No puedo iniciar sesión',
            solutions: [
              'Verifica que tu código esté escrito correctamente',
              'Asegúrate de que tu cuenta esté activa',
              'Si eres administrador, verifica email y contraseña',
              'Contacta al administrador si el problema persiste'
            ]
          },
          {
            title: 'Los datos no se cargan',
            solutions: [
              'Verifica tu conexión a internet',
              'Actualiza la página (F5)',
              'Si estás offline, verás los últimos datos guardados',
              'Espera a recuperar conexión para datos actualizados'
            ]
          },
          {
            title: 'Error al importar Excel',
            solutions: [
              'Verifica que el archivo tenga todas las columnas requeridas',
              'Asegúrate de que el archivo no exceda 5MB',
              'Revisa que los datos estén en el formato correcto',
              'Intenta con un archivo más pequeño si es muy grande'
            ]
          },
          {
            title: 'La aplicación está lenta',
            solutions: [
              'Cierra otras pestañas del navegador',
              'Verifica tu conexión a internet',
              'Actualiza la página para limpiar la caché',
              'Usa un navegador actualizado (Chrome, Firefox, Edge)'
            ]
          }
        ],
        contact: {
          title: 'Contacto de Soporte',
          info: [
            'Email: soporte@edessa.com',
            'Teléfono: +1 (809) 555-0123',
            'Horario: Lunes a Viernes, 8:00 AM - 6:00 PM',
            'Respuesta promedio: 2-4 horas hábiles'
          ]
        }
      }
    }
  }

  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const sidebarItems = [
    { id: 'overview', title: 'Visión General', icon: Book },
    { id: 'login', title: 'Inicio de Sesión', icon: User },
    { id: 'vendedor', title: 'Panel Vendedor', icon: User },
    { id: 'supervisor', title: 'Panel Supervisor', icon: Shield },
    { id: 'admin', title: 'Panel Admin', icon: Settings },
    { id: 'upload', title: 'Importar Excel', icon: Upload },
    { id: 'troubleshooting', title: 'Problemas', icon: HelpCircle }
  ]

  const renderContent = () => {
    const section = guideData[activeSection]
    if (!section) return null

    return (
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center space-x-3">
          <section.icon className="w-8 h-8 text-primary-600" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {section.title}
          </h2>
        </div>

        <p className="text-lg text-gray-600 dark:text-gray-400">
          {section.content.description}
        </p>

        {/* Contenido específico por sección */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Características */}
            <div className="card">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Características Principales
              </h3>
              <ul className="space-y-2">
                {section.content.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-success-500" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Roles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {section.content.roles.map((role, index) => (
                <motion.div
                  key={role.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <role.icon className="w-6 h-6 text-primary-600" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {role.name}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {role.description}
                  </p>
                  <ul className="space-y-1">
                    {role.access.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Pasos para login */}
        {activeSection === 'login' && (
          <div className="space-y-6">
            {section.content.steps.map((step, index) => (
              <div key={index} className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <ol className="space-y-2">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-sm font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{detail}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}

            <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Consejos Útiles
              </h3>
              <ul className="space-y-2">
                {section.content.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-blue-800 dark:text-blue-200 text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Secciones de paneles */}
        {(activeSection === 'vendedor' || activeSection === 'supervisor' || activeSection === 'admin') && (
          <div className="space-y-6">
            {section.content.sections.map((sec, index) => (
              <div key={index} className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {sec.title}
                </h3>
                <ul className="space-y-2">
                  {sec.items.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {section.content.offline && (
              <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  Funcionalidad Offline
                </h3>
                <p className="text-green-800 dark:text-green-200 text-sm">
                  {section.content.offline}
                </p>
              </div>
            )}

            {section.content.tips && (
              <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
                  Consejos
                </h3>
                <ul className="space-y-2">
                  {section.content.tips.map((tip, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-yellow-800 dark:text-yellow-200 text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Sección de upload */}
        {activeSection === 'upload' && (
          <div className="space-y-6">
            {section.content.steps.map((step, index) => (
              <div key={index} className="card">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="w-8 h-8 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                </div>
                <ul className="space-y-2 ml-11">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="text-gray-700 dark:text-gray-300 text-sm">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="card bg-gray-50 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {section.content.formats.title}
              </h3>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <code className="text-sm">
                  {section.content.formats.example.map((line, index) => (
                    <div key={index} className="text-gray-800 dark:text-gray-200">
                      {line}
                    </div>
                  ))}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Sección de troubleshooting */}
        {activeSection === 'troubleshooting' && (
          <div className="space-y-6">
            {section.content.problems.map((problem, index) => (
              <div key={index} className="card">
                <button
                  onClick={() => toggleExpanded(`problem-${index}`)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {problem.title}
                  </h3>
                  {expandedItems[`problem-${index}`] ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedItems[`problem-${index}`] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <ul className="space-y-2">
                        {problem.solutions.map((solution, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{solution}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                {section.content.contact.title}
              </h3>
              <ul className="space-y-2">
                {section.content.contact.info.map((info, index) => (
                  <li key={index} className="text-blue-800 dark:text-blue-200 text-sm">
                    {info}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Guía de Uso
          </h2>
          <nav className="space-y-1">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className={`mr-3 h-4 w-4 ${isActive ? 'text-primary-500' : ''}`} />
                  {item.title}
                </motion.button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default GuideSection
