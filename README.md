# Generador de Clientes sin Ventas Multicategoría

Una aplicación PWA desarrollada con React, TypeScript y Supabase para la gestión de clientes sin ventas multicategoría.

## 🚀 Despliegue en GitHub Pages

Esta aplicación está configurada para desplegarse automáticamente en GitHub Pages cuando se hace push a la rama `main`.

### URL de la aplicación:
https://edessa0507.github.io/Clientes-sin-Ventas-Multicategoria/

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI**: Tailwind CSS + Lucide React
- **PWA**: Vite PWA Plugin
- **Autenticación**: Supabase Auth

## 📱 Características

- **PWA**: Instalable en dispositivos móviles
- **Dashboard Administrativo**: Gestión completa de datos
- **Dashboard de Vendedores**: Vista específica para vendedores
- **Dashboard de Supervisores**: Vista para supervisores
- **Carga de archivos Excel**: Importación masiva de datos
- **Autenticación segura**: Sistema de roles (admin, supervisor, vendedor)

## 🔧 Configuración Local

1. Clona el repositorio
2. Instala las dependencias: `npm install`
3. Configura las variables de entorno de Supabase
4. Ejecuta en modo desarrollo: `npm run dev`

## 📊 Funcionalidades

- ✅ Autenticación con códigos de acceso
- ✅ Dashboard administrativo con KPIs
- ✅ Carga y procesamiento de archivos Excel
- ✅ Gestión de vendedores, clientes y asignaciones
- ✅ PWA con cache offline
- ✅ Responsive design

## 🚀 Despliegue Automático

El proyecto se despliega automáticamente en GitHub Pages usando GitHub Actions cuando:
- Se hace push a la rama `main`
- Se crea un pull request hacia `main`

El workflow está configurado en `.github/workflows/deploy.yml`