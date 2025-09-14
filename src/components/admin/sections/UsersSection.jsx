import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  User, 
  Settings,
  Search,
  Filter,
  CheckCircle,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const UsersSection = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('todos')
  const [newUser, setNewUser] = useState({
    codigo: '',
    nombre: '',
    email: '',
    tipo: 'vendedor',
    zona_id: '',
    supervisor_id: ''
  })

  // Datos de ejemplo
  useEffect(() => {
    setUsers([
      {
        id: '1',
        codigo: 'E56',
        nombre: 'Pedro José Burgos',
        email: 'pedro.burgos@edessa.com',
        tipo: 'vendedor',
        zona: 'Santo Domingo',
        supervisor: 'Carlos Valdez',
        activo: true,
        ultimo_acceso: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        codigo: 'SUP001',
        nombre: 'Carlos Valdez',
        email: 'carlos.valdez@edessa.com',
        tipo: 'supervisor',
        zona: 'Santo Domingo',
        activo: true,
        ultimo_acceso: '2024-01-15T09:15:00Z'
      },
      {
        id: '3',
        codigo: 'E81',
        nombre: 'Yeuri Antonio Pardo Acosta',
        email: 'yeuri.pardo@edessa.com',
        tipo: 'vendedor',
        zona: 'Santo Domingo',
        supervisor: 'Ismael Zorrilla',
        activo: true,
        ultimo_acceso: '2024-01-14T16:45:00Z'
      }
    ])
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'todos' || user.tipo === filterRole
    
    return matchesSearch && matchesRole
  })

  const handleCreateUser = async () => {
    if (!newUser.codigo || !newUser.nombre || !newUser.email) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)
    try {
      // Simular creación de usuario
      const user = {
        id: Date.now().toString(),
        ...newUser,
        activo: true,
        ultimo_acceso: null
      }
      
      setUsers(prev => [...prev, user])
      setShowCreateModal(false)
      setNewUser({
        codigo: '',
        nombre: '',
        email: '',
        tipo: 'vendedor',
        zona_id: '',
        supervisor_id: ''
      })
      
      toast.success('Usuario creado exitosamente')
    } catch (error) {
      toast.error('Error al crear el usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (userId) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, activo: !user.activo }
        : user
    ))
    
    toast.success('Estado del usuario actualizado')
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return
    }

    setUsers(prev => prev.filter(user => user.id !== userId))
    toast.success('Usuario eliminado')
  }

  const getRoleIcon = (tipo) => {
    switch (tipo) {
      case 'admin':
        return <Settings className="w-4 h-4 text-warning-500" />
      case 'supervisor':
        return <Shield className="w-4 h-4 text-success-500" />
      case 'vendedor':
        return <User className="w-4 h-4 text-primary-500" />
      default:
        return <User className="w-4 h-4 text-gray-500" />
    }
  }

  const getRoleBadge = (tipo) => {
    const styles = {
      admin: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
      supervisor: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
      vendedor: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[tipo] || styles.vendedor}`}>
        {getRoleIcon(tipo)}
        <span className="ml-1 capitalize">{tipo}</span>
      </span>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Administración de Usuarios
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Crear, editar y administrar usuarios del sistema
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Usuario</span>
        </button>
      </div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="input-field"
            >
              <option value="todos">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="supervisor">Supervisores</option>
              <option value="vendedor">Vendedores</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Tabla de usuarios */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Usuarios ({filteredUsers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Zona/Supervisor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Último Acceso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {user.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.nombre}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.codigo} • {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.tipo)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div>
                      <div>{user.zona}</div>
                      {user.supervisor && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Sup: {user.supervisor}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(user.id)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.activo
                          ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {user.activo ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Activo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactivo
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.ultimo_acceso 
                      ? new Date(user.ultimo_acceso).toLocaleDateString()
                      : 'Nunca'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        title="Editar usuario"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No hay usuarios
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || filterRole !== 'todos'
                ? 'No se encontraron usuarios con los filtros aplicados.'
                : 'Comienza creando tu primer usuario.'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Modal de crear usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Crear Nuevo Usuario
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={newUser.codigo}
                    onChange={(e) => setNewUser(prev => ({ ...prev, codigo: e.target.value }))}
                    className="input-field"
                    placeholder="Ej: E56, SUP001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={newUser.nombre}
                    onChange={(e) => setNewUser(prev => ({ ...prev, nombre: e.target.value }))}
                    className="input-field"
                    placeholder="Nombre completo del usuario"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="input-field"
                    placeholder="usuario@edessa.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Usuario *
                  </label>
                  <select
                    value={newUser.tipo}
                    onChange={(e) => setNewUser(prev => ({ ...prev, tipo: e.target.value }))}
                    className="input-field"
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersSection
