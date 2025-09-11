import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import VendedorDashboard from './pages/VendedorDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import LoadingSpinner from './components/LoadingSpinner'
import OfflineBanner from './components/OfflineBanner'
import ThemeProvider from './contexts/ThemeContext'

// Componente para rutas protegidas
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isAdmin, isSupervisor, isVendedor, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  // Verificar rol específico si se requiere
  if (requiredRole) {
    switch (requiredRole) {
      case 'admin':
        if (!isAdmin()) return <Navigate to="/dashboard" replace />
        break
      case 'supervisor':
        if (!isSupervisor()) return <Navigate to="/dashboard" replace />
        break
      case 'vendedor':
        if (!isVendedor()) return <Navigate to="/dashboard" replace />
        break
    }
  }

  return children
}

// Componente para redireccionar según el rol
const DashboardRedirect = () => {
  const { isAdmin, isSupervisor, isVendedor } = useAuth()

  if (isAdmin()) {
    return <Navigate to="/admin" replace />
  } else if (isSupervisor()) {
    return <Navigate to="/supervisor" replace />
  } else if (isVendedor()) {
    return <Navigate to="/vendedor" replace />
  }

  return <Navigate to="/login" replace />
}

// Componente principal de la aplicación
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <OfflineBanner />
      
      <Routes>
        {/* Ruta de login */}
        <Route 
          path="/login" 
          element={
            isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } 
        />

        {/* Redirección automática según rol */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } 
        />

        {/* Dashboard de vendedor */}
        <Route 
          path="/vendedor" 
          element={
            <ProtectedRoute requiredRole="vendedor">
              <VendedorDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Dashboard de supervisor */}
        <Route 
          path="/supervisor" 
          element={
            <ProtectedRoute requiredRole="supervisor">
              <SupervisorDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Dashboard de administrador */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Ruta por defecto */}
        <Route 
          path="/" 
          element={
            isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          } 
        />

        {/* Ruta 404 */}
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>

      {/* Notificaciones toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
            border: '1px solid var(--toast-border)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </div>
  )
}

// Componente raíz de la aplicación
const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
