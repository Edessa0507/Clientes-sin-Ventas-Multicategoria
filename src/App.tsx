import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import VendedorDashboard from './pages/VendedorDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import LoadingSpinner from './components/LoadingSpinner'
import OfflineIndicator from './components/OfflineIndicator'

function App() {
  const { user, isLoading, initializeAuth } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initializeAuth()
    return () => {
      unsubscribe()
    }
  }, [initializeAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <OfflineIndicator />
      
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
        />
        
        <Route 
          path="/dashboard" 
          element={
            user ? (
              user.rol === 'vendedor' ? <VendedorDashboard /> :
              user.rol === 'supervisor' ? <SupervisorDashboard /> :
              user.rol === 'admin' ? <AdminDashboard /> :
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        <Route 
          path="/" 
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
        />
        
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </div>
  )
}

export default App
