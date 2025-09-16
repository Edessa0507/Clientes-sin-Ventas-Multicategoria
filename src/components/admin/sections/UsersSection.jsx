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
import { userManagementService } from '../../../lib/supabase'

const UsersSection = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('todos')
  const [newUser, setNewUser] = useState({
    codigo: '',
    nombre_completo: '',
    email: '',
    tipo: 'vendedor'
  })

  // Cargar usuarios reales desde Supabase
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const result = await userManagementService.getAllUsers()
      if (result.data) {
        setUsers(result.data)
      } else {
        toast.error('Error al cargar usuarios: ' + result.error)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'todos' || user.tipo === filterRole
    
    return matchesSearch && matchesRole
  })

  const handleCreateUser = async () => {
    if (!newUser.codigo || !newUser.nombre_completo || !newUser.email) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)
    try {
      const result = await userManagementService.createUser(newUser)
      
      if (result.data) {
        await loadUsers() // Recargar lista
        setShowCreateModal(false)
        setNewUser({
          codigo: '',
          nombre_completo: '',
          email: '',
          tipo: 'vendedor'
        })
        toast.success('Usuario creado exitosamente')
      } else {
        toast.error('Error al crear usuario: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Error al crear el usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (userId, tipo, currentStatus) => {
    try {
      const result = await userManagementService.toggleUserStatus(userId, tipo, !currentStatus)
      
      if (result.data) {
        await loadUsers() // Recargar lista
        toast.success('Estado del usuario actualizado')
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast.error('Error al actualizar estado')
    }
  }

  const handleDeleteUser = async (userId, tipo) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return
    }

    try {
      const result = await userManagementService.deleteUser(userId, tipo)
      
      if (result.data) {
        await loadUsers() // Recargar lista
        toast.success('Usuario eliminado')
      } else {
        toast.error('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Error al eliminar usuario')
    }
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
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {user.nombre_completo?.charAt(0) || user.codigo?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.nombre_completo || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.codigo}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.tipo === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      user.tipo === 'supervisor' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {user.tipo === 'admin' ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Administrador
                        </>
                      ) : user.tipo === 'supervisor' ? (
                        <>
                          <Users className="w-3 h-3 mr-1" />
                          Supervisor
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          Vendedor
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {user.zona_nombre || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(user.id, user.tipo, user.activo)}
                      disabled={user.tipo === 'admin'}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.activo
                          ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      } ${user.tipo === 'admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                    {user.created_at 
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {user.tipo !== 'admin' && (
                        <>
                          <button
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                            title="Editar usuario"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.tipo)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {user.tipo === 'admin' && (
                        <span className="text-xs text-gray-400">Protegido</span>
                      )}
                    </div>
                  </td>
                </motion.tr>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={newUser.nombre_completo}
                    onChange={(e) => setNewUser(prev => ({ ...prev, nombre_completo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Ingresa el nombre completo"
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
