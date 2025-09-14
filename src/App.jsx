import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { UserProvider, useUser } from './context/UserContext'
import LoginPage from './components/auth/LoginPage'
import VendedorDashboard from './components/vendedor/VendedorDashboard'
import SupervisorDashboard from './components/supervisor/SupervisorDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import LoadingSpinner from './components/ui/LoadingSpinner'
import ConnectionStatus from './components/ui/ConnectionStatus'
import { supabase } from './lib/supabase'
import { pwaManager } from './lib/pwa'

function AppContent() {
  const { user, loading } = useUser()

  useEffect(() => {
    // Inicializar PWA Manager
    pwaManager.registerServiceWorker()
  }, [])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <Router basename="/Clientes-sin-Ventas-Multicategoria">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          {/* Ruta de login */}
          <Route 
            path="/login" 
            element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
          />
          
          {/* Rutas protegidas */}
          <Route 
            path="/dashboard" 
            element={
              user ? (
                user.tipo === 'vendedor' ? <VendedorDashboard /> :
                user.tipo === 'supervisor' ? <SupervisorDashboard /> :
                user.tipo === 'admin' ? <AdminDashboard /> :
                <Navigate to="/login" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          {/* Ruta por defecto */}
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
          />
          
          {/* Ruta 404 */}
          <Route 
            path="*" 
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
          />
        </Routes>
        
        {/* Connection Status */}
        <ConnectionStatus />
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              theme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              theme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  )
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  )
}

export default App
