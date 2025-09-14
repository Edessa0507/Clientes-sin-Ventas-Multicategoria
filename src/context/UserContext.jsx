import React, { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '../lib/supabase'

const UserContext = createContext()

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser debe ser usado dentro de UserProvider')
  }
  return context
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión guardada al cargar
    const checkSession = () => {
      try {
        const savedSession = auth.getSession()
        if (savedSession) {
          setUser(savedSession.user)
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = async (credentials, tipo) => {
    setLoading(true)
    try {
      let result
      
      if (tipo === 'admin') {
        result = await auth.loginAdmin(credentials.email, credentials.password)
      } else {
        result = await auth.loginWithCode(credentials.codigo, tipo)
      }

      if (result.error) {
        throw new Error(result.error)
      }

      const userData = tipo === 'admin' ? {
        id: result.data.user.id,
        email: result.data.user.email,
        tipo: 'admin'
      } : result.data.user

      setUser(userData)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await auth.logout()
      setUser(null)
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    setUser,
    setLoading
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
