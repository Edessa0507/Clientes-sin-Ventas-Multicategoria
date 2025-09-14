// Utilidades para PWA y funcionalidad offline
import { offlineCache } from './database'

export class PWAManager {
  constructor() {
    this.isOnline = navigator.onLine
    this.installPrompt = null
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Detectar cambios de conexión
    window.addEventListener('online', () => {
      this.isOnline = true
      this.handleOnline()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.handleOffline()
    })

    // Capturar evento de instalación
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.installPrompt = e
      this.showInstallButton()
    })

    // Detectar cuando la app se instala
    window.addEventListener('appinstalled', () => {
      this.hideInstallButton()
      this.showInstallSuccess()
    })
  }

  handleOnline() {
    // Mostrar notificación de conexión restaurada
    this.showNotification('Conexión restaurada', 'success')
    
    // Sincronizar datos pendientes
    this.syncPendingData()
    
    // Limpiar cache antiguo
    offlineCache.clearOldCache()
  }

  handleOffline() {
    this.showNotification('Sin conexión - Trabajando offline', 'warning')
  }

  async syncPendingData() {
    try {
      // Aquí se implementaría la lógica de sincronización
      // Por ahora solo limpiamos cache antiguo
      await offlineCache.clearOldCache()
    } catch (error) {
      console.error('Error syncing data:', error)
    }
  }

  showNotification(message, type = 'info') {
    // Crear notificación personalizada
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`
    notification.textContent = message
    
    document.body.appendChild(notification)
    
    // Remover después de 3 segundos
    setTimeout(() => {
      notification.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }

  showInstallButton() {
    // Mostrar botón de instalación si no existe
    if (!document.getElementById('pwa-install-button')) {
      const button = document.createElement('button')
      button.id = 'pwa-install-button'
      button.innerHTML = `
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Instalar App
      `
      button.className = 'fixed bottom-4 right-4 z-50 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center transition-all duration-200'
      
      button.addEventListener('click', () => this.installApp())
      document.body.appendChild(button)
    }
  }

  hideInstallButton() {
    const button = document.getElementById('pwa-install-button')
    if (button) {
      button.remove()
    }
  }

  async installApp() {
    if (!this.installPrompt) return

    try {
      const result = await this.installPrompt.prompt()
      if (result.outcome === 'accepted') {
        this.hideInstallButton()
      }
    } catch (error) {
      console.error('Error installing app:', error)
    }

    this.installPrompt = null
  }

  showInstallSuccess() {
    this.showNotification('¡App instalada correctamente!', 'success')
  }

  // Verificar si la app está instalada
  isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true
  }

  // Obtener información del dispositivo
  getDeviceInfo() {
    return {
      isOnline: this.isOnline,
      isInstalled: this.isAppInstalled(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    }
  }

  // Registrar Service Worker
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/Clientes-sin-Ventas-Multicategoria/'
        })
        
        console.log('Service Worker registered:', registration)
        
        // Escuchar actualizaciones
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateAvailable()
            }
          })
        })
        
        return registration
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  showUpdateAvailable() {
    const updateBanner = document.createElement('div')
    updateBanner.className = 'fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-4 text-center'
    updateBanner.innerHTML = `
      <p class="mb-2">Nueva versión disponible</p>
      <button id="update-app" class="bg-white text-blue-600 px-4 py-1 rounded mr-2">Actualizar</button>
      <button id="dismiss-update" class="border border-white px-4 py-1 rounded">Más tarde</button>
    `
    
    document.body.appendChild(updateBanner)
    
    document.getElementById('update-app').addEventListener('click', () => {
      window.location.reload()
    })
    
    document.getElementById('dismiss-update').addEventListener('click', () => {
      updateBanner.remove()
    })
  }

  // Manejar compartir contenido
  async shareContent(data) {
    if (navigator.share) {
      try {
        await navigator.share(data)
        return true
      } catch (error) {
        console.error('Error sharing:', error)
        return false
      }
    } else {
      // Fallback para navegadores que no soportan Web Share API
      this.fallbackShare(data)
      return true
    }
  }

  fallbackShare(data) {
    const shareText = `${data.title}\n${data.text}\n${data.url}`
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText)
      this.showNotification('Enlace copiado al portapapeles', 'success')
    } else {
      // Crear elemento temporal para copiar
      const textArea = document.createElement('textarea')
      textArea.value = shareText
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      this.showNotification('Enlace copiado al portapapeles', 'success')
    }
  }
}

// Instancia global del PWA Manager
export const pwaManager = new PWAManager()

// Inicializar PWA cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pwaManager.registerServiceWorker()
  })
} else {
  pwaManager.registerServiceWorker()
}
