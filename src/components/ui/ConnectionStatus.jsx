import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { pwaManager } from '../../lib/pwa'

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showStatus, setShowStatus] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowStatus(true)
      setLastSync(new Date())
      
      // Ocultar después de 3 segundos
      setTimeout(() => setShowStatus(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowStatus(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Mostrar estado inicial si está offline
    if (!navigator.onLine) {
      setShowStatus(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = async () => {
    try {
      // Intentar reconectar
      const response = await fetch('/Clientes-sin-Ventas-Multicategoria/', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      
      if (response.ok) {
        setIsOnline(true)
        setLastSync(new Date())
        pwaManager.showNotification('Conexión restaurada', 'success')
      }
    } catch (error) {
      pwaManager.showNotification('Sin conexión disponible', 'error')
    }
  }

  if (!showStatus && isOnline) return null

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 ${
            isOnline 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          
          <span className="text-sm font-medium">
            {isOnline ? 'Conectado' : 'Sin conexión'}
          </span>
          
          {lastSync && isOnline && (
            <span className="text-xs opacity-90">
              Sincronizado {lastSync.toLocaleTimeString()}
            </span>
          )}
          
          {!isOnline && (
            <button
              onClick={handleRetry}
              className="ml-2 p-1 rounded hover:bg-red-600 transition-colors"
              title="Reintentar conexión"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
