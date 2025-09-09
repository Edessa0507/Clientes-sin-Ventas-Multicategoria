import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowIndicator(true)
      setTimeout(() => setShowIndicator(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowIndicator(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showIndicator && isOnline) return null

  return (
    <div className={`offline-indicator ${isOnline ? 'bg-success-500' : 'bg-warning-500'}`}>
      <div className="flex items-center gap-2">
        {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span className="text-sm font-medium">
          {isOnline ? 'Conexión restaurada' : 'Sin conexión - Modo offline'}
        </span>
      </div>
    </div>
  )
}
