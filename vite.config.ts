import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: '/Clientes-sin-Ventas-Multicategoria/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      // Habilitar desinstalación para limpiar SW y cachés obsoletos (temporal)
      selfDestroying: true,
      manifest: {
        name: 'Generador de Clientes - EDESSA',
        short_name: 'GenClientes',
        description: 'PWA para gestión de clientes sin ventas multicategoría',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Clientes-sin-Ventas-Multicategoria/',
        start_url: '/Clientes-sin-Ventas-Multicategoria/#/',
        icons: [
          {
            src: '/Clientes-sin-Ventas-Multicategoria/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/Clientes-sin-Ventas-Multicategoria/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/Clientes-sin-Ventas-Multicategoria/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/Clientes-sin-Ventas-Multicategoria/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          },
          {
            src: '/Clientes-sin-Ventas-Multicategoria/favicon.ico',
            sizes: '32x32',
            type: 'image/x-icon'
          },
          {
            src: '/Clientes-sin-Ventas-Multicategoria/masked-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  define: {
    global: 'globalThis'
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    sourcemap: true
  }
})
