import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider')
  }
  return context
}

const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Verificar preferencia guardada o del sistema
    const saved = localStorage.getItem('theme')
    if (saved) {
      return saved === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // Aplicar tema al documento
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.setProperty('--toast-bg', '#374151')
      document.documentElement.style.setProperty('--toast-color', '#f9fafb')
      document.documentElement.style.setProperty('--toast-border', '#4b5563')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.setProperty('--toast-bg', '#ffffff')
      document.documentElement.style.setProperty('--toast-color', '#111827')
      document.documentElement.style.setProperty('--toast-border', '#e5e7eb')
    }

    // Guardar preferencia
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  const value = {
    isDark,
    toggleTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
