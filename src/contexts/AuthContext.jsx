import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../lib/supabase'
import { offline, connectivity } from '../lib/database'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [vendedor, setVendedor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(connectivity.isOnline())

  useEffect(() => {
    // Verificar sesión existente
    checkSession()

    // Escuchar cambios de conectividad
    const unsubscribe = connectivity.onStatusChange((online) => {
      setIsOnline(online)
      if (online) {
        toast.success('Conexión restaurada')
      } else {
        toast.error('Sin conexión - Modo offline')
      }
    })

    return unsubscribe
  }, [])

  const checkSession = async () => {
    try {
      const { user: currentUser, vendedor: vendedorData } = await auth.getCurrentUser()
      setUser(currentUser)
      setVendedor(vendedorData)
    } catch (error) {
      console.error('Error checking session:', error)
    } finally {
      setLoading(false)
    }
  }

  const signInAdmin = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await auth.signInAdmin(email, password)
      
      if (error) {
        toast.error(error.message)
        return { success: false, error }
      }

      setUser(data.user)
      setVendedor(null)
      toast.success('Sesión iniciada como administrador')
      return { success: true, data }
    } catch (error) {
      toast.error('Error al iniciar sesión')
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const signInVendedor = async (codigo) => {
    try {
      setLoading(true)
      
      // Si estamos offline, intentar desde cache
      if (!isOnline) {
        const cachedVendedores = await offline.getCachedVendedores()
        const vendedorOffline = cachedVendedores.find(v => 
          v.vendedor_codigo.toUpperCase() === codigo.toUpperCase()
        )
        
        if (vendedorOffline) {
          setVendedor(vendedorOffline)
          setUser({ id: 'offline-user' })
          toast.success(`Bienvenido ${vendedorOffline.nombre} (Modo offline)`)
          return { success: true, data: { vendedor: vendedorOffline } }
        } else {
          toast.error('Código no encontrado en cache offline')
          return { success: false, error: { message: 'Sin conexión y código no en cache' } }
        }
      }

      // Intentar login online
      const { data, error } = await auth.signInVendedor(codigo)
      
      if (error) {
        toast.error(error.message)
        return { success: false, error }
      }

      setUser(data.user)
      setVendedor(data.vendedor)
      toast.success(`Bienvenido ${data.vendedor.nombre}`)
      return { success: true, data }
    } catch (error) {
      toast.error('Error al iniciar sesión')
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await auth.signOut()
      setUser(null)
      setVendedor(null)
      toast.success('Sesión cerrada')
    } catch (error) {
      toast.error('Error al cerrar sesión')
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = () => {
    return vendedor?.rol === 'admin' || (user && !vendedor)
  }

  const isSupervisor = () => {
    return vendedor?.rol === 'supervisor'
  }

  const isVendedor = () => {
    return vendedor?.rol === 'vendedor'
  }

  const isAuthenticated = () => {
    return !!(user || vendedor)
  }

  const value = {
    user,
    vendedor,
    loading,
    isOnline,
    signInAdmin,
    signInVendedor,
    signOut,
    isAdmin,
    isSupervisor,
    isVendedor,
    isAuthenticated,
    checkSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
