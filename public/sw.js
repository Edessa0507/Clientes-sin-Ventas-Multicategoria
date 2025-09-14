// Service Worker para PWA - Clientes sin Ventas Multicategoría
const CACHE_NAME = 'clientes-app-v1.0.0'
const OFFLINE_URL = '/Clientes-sin-Ventas-Multicategoria/offline.html'

// Recursos críticos para cachear
const CRITICAL_RESOURCES = [
  '/Clientes-sin-Ventas-Multicategoria/',
  '/Clientes-sin-Ventas-Multicategoria/index.html',
  '/Clientes-sin-Ventas-Multicategoria/manifest.json',
  '/Clientes-sin-Ventas-Multicategoria/offline.html'
]

// Recursos de Supabase y APIs externas
const API_CACHE_PATTERNS = [
  /^https:\/\/ualdsvobfonbmsuhmtsr\.supabase\.co\/rest\/v1\//,
  /^https:\/\/ualdsvobfonbmsuhmtsr\.supabase\.co\/auth\/v1\//
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching critical resources')
        return cache.addAll(CRITICAL_RESOURCES)
      })
      .then(() => {
        // Forzar activación inmediata
        return self.skipWaiting()
      })
  )
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Tomar control de todas las pestañas
      self.clients.claim()
    ])
  )
})

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo manejar requests GET
  if (request.method !== 'GET') {
    return
  }

  // Estrategia para recursos de la app
  if (url.origin === location.origin) {
    event.respondWith(handleAppRequest(request))
    return
  }

  // Estrategia para APIs de Supabase
  if (isSupabaseAPI(url)) {
    event.respondWith(handleSupabaseRequest(request))
    return
  }

  // Para otros recursos, usar cache first
  event.respondWith(handleOtherRequest(request))
})

// Manejar requests de la aplicación
async function handleAppRequest(request) {
  const url = new URL(request.url)
  
  // Para navegación, usar network first con fallback
  if (request.mode === 'navigate') {
    try {
      const networkResponse = await fetch(request)
      
      // Cachear la respuesta si es exitosa
      if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME)
        cache.put(request, networkResponse.clone())
      }
      
      return networkResponse
    } catch (error) {
      console.log('Network failed, serving from cache or offline page')
      
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }
      
      // Servir página offline
      return caches.match(OFFLINE_URL)
    }
  }

  // Para otros recursos, cache first
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Failed to fetch resource:', request.url)
    throw error
  }
}

// Manejar requests de Supabase
async function handleSupabaseRequest(request) {
  const cacheKey = generateCacheKey(request)
  
  try {
    // Intentar network first para datos frescos
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cachear respuestas exitosas por tiempo limitado
      const cache = await caches.open(CACHE_NAME)
      const responseToCache = networkResponse.clone()
      
      // Agregar timestamp para expiración
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cached-at', Date.now().toString())
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      })
      
      cache.put(cacheKey, cachedResponse)
    }
    
    return networkResponse
  } catch (error) {
    console.log('Supabase network failed, trying cache:', request.url)
    
    const cachedResponse = await caches.match(cacheKey)
    if (cachedResponse) {
      // Verificar si el cache no ha expirado (30 minutos)
      const cachedAt = cachedResponse.headers.get('sw-cached-at')
      if (cachedAt) {
        const age = Date.now() - parseInt(cachedAt)
        if (age < 30 * 60 * 1000) { // 30 minutos
          console.log('Serving cached Supabase data')
          return cachedResponse
        }
      }
    }
    
    // Si no hay cache válido, lanzar error para manejo offline
    throw error
  }
}

// Manejar otros requests
async function handleOtherRequest(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Failed to fetch external resource:', request.url)
    throw error
  }
}

// Verificar si es API de Supabase
function isSupabaseAPI(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.href))
}

// Generar clave de cache para requests de API
function generateCacheKey(request) {
  const url = new URL(request.url)
  
  // Para requests de Supabase, incluir parámetros importantes
  if (isSupabaseAPI(url)) {
    // Normalizar la URL para cache consistente
    const params = new URLSearchParams(url.search)
    const sortedParams = new URLSearchParams()
    
    // Ordenar parámetros para cache consistente
    Array.from(params.keys()).sort().forEach(key => {
      sortedParams.set(key, params.get(key))
    })
    
    url.search = sortedParams.toString()
  }
  
  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers
  })
}

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  const { type, payload } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CACHE_URLS':
      if (payload && payload.urls) {
        cacheUrls(payload.urls)
      }
      break
      
    case 'CLEAR_CACHE':
      clearCache()
      break
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status })
      })
      break
  }
})

// Cachear URLs específicas
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(urls)
    console.log('URLs cached successfully:', urls)
  } catch (error) {
    console.error('Failed to cache URLs:', error)
  }
}

// Limpiar cache
async function clearCache() {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    )
    console.log('All caches cleared')
  } catch (error) {
    console.error('Failed to clear cache:', error)
  }
}

// Obtener estado del cache
async function getCacheStatus() {
  try {
    const cache = await caches.open(CACHE_NAME)
    const keys = await cache.keys()
    
    return {
      cacheName: CACHE_NAME,
      cachedUrls: keys.length,
      urls: keys.map(request => request.url)
    }
  } catch (error) {
    console.error('Failed to get cache status:', error)
    return { error: error.message }
  }
}

// Manejar errores no capturados
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason)
})
