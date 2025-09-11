import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const OfflineBanner = () => {
  const { isOnline } = useAuth()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-warning-500 text-white px-4 py-2 shadow-lg"
        >
          <div className="flex items-center justify-center space-x-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              Sin conexión - Mostrando datos guardados
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default OfflineBanner
