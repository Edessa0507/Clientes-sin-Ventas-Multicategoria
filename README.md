# Generador de Clientes sin Ventas Multicategoría

PWA moderna para la gestión de clientes sin ventas por categorías, desarrollada con React, Vite, Tailwind CSS y Supabase.

## 🌐 Aplicación Desplegada

**URL de Producción**: [https://edessa0507.github.io/Clientes-sin-Ventas-Multicategoria/](https://edessa0507.github.io/Clientes-sin-Ventas-Multicategoria/)

### Credenciales de Acceso

**Administrador:**
- **Código**: ADMIN001
- **Nombre**: GUSTAVO REYES
- **Email**: gustavo.reyes@edessa.do
- **Contraseña**: EdessA2748
- **Rol**: Administrador

## 🚀 Características

- **PWA Offline-First**: Funciona sin conexión con los últimos datos disponibles
- **Autenticación Multi-Rol**: Admin, Supervisor y Vendedor con permisos diferenciados
- **Importación Excel**: Procesamiento automático de archivos Excel con validación
- **Dashboard Interactivo**: Visualización de datos con filtros y estadísticas en tiempo real
- **Responsive Design**: Optimizado para móvil y escritorio
- **Modo Oscuro**: Tema claro/oscuro con persistencia
- **Seguridad RLS**: Row Level Security implementado en Supabase

## 🏗️ Arquitectura

### Frontend
- **React 18** con hooks y context
- **Vite** para desarrollo y build optimizado
- **Tailwind CSS** para estilos responsivos
- **Framer Motion** para animaciones fluidas
- **React Router** para navegación SPA

### Backend
- **Supabase** (PostgreSQL + Auth + RLS)
- **Row Level Security** para control de acceso granular
- **Triggers** para auditoría y timestamps automáticos

### PWA
- **Service Worker** con estrategias de cache
- **IndexedDB** para almacenamiento offline
- **Manifest** con shortcuts y screenshots

## 📦 Instalación

1. **Clonar el repositorio**
```bash
git clone <url-del-repositorio>
cd "Nuevo - Windsurf -Clientes sin Ventas Multicategoria"
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

4. **Configurar base de datos**
- Crear proyecto en [Supabase](https://supabase.com)
- Ejecutar el script `supabase-schema.sql` en el SQL Editor
- Verificar que RLS esté habilitado

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

## 🗄️ Estructura de Base de Datos

### Tablas Principales

- **auth_users**: Usuarios con roles (admin, supervisor, vendedor)
- **clientes**: Catálogo de clientes
- **categorias**: Catálogo de categorías de productos
- **asignaciones**: Tabla principal con estado por cliente/vendedor/categoría
- **import_runs**: Registro de importaciones realizadas

### Roles y Permisos

- **Admin**: Acceso completo, importación de datos
- **Supervisor**: Solo lectura de su zona asignada
- **Vendedor**: Solo lectura de sus propias asignaciones

## 📊 Uso del Sistema

### Login por Roles

#### Vendedor/Supervisor
1. Ingresar código de vendedor (ej: E56)
2. El sistema autocompleta el nombre
3. Acceso directo al dashboard correspondiente

#### Administrador
1. Email y contraseña
2. Acceso al panel de administración completo

### Importación de Excel

1. Seleccionar fecha del reporte
2. Arrastrar archivo Excel o hacer clic para seleccionar
3. El sistema detecta automáticamente:
   - Columnas requeridas: SUPERVISOR, VENDEDOR, RUTA, CLIENTE
   - Columnas de categorías (todas después de CLIENTE)
4. Vista previa de datos procesados
5. Aplicar importación (reemplaza datos de la fecha)

### Formato Excel Esperado

```
SUPERVISOR | VENDEDOR | RUTA | CLIENTE | ENSURE | CHOCOLATE | ALPINA | ...
SUP01 | E56 - PEDRO BURGOS | 1L - Lunes 1x | 61842 - CASA NANDO | Activado | FALTA | 0 | ...
```

## 🔧 Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run preview      # Vista previa del build
npm run lint         # Linter ESLint
npm run deploy       # Build y deploy a GitHub Pages
```

### Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── AdminStats.jsx
│   ├── ClienteCard.jsx
│   ├── ExcelImporter.jsx
│   ├── LoadingSpinner.jsx
│   ├── OfflineBanner.jsx
│   ├── StatsCard.jsx
│   ├── ThemeToggle.jsx
│   └── VendedorCard.jsx
├── contexts/           # Context providers
│   ├── AuthContext.jsx
│   └── ThemeContext.jsx
├── lib/               # Utilidades y configuración
│   ├── database.js    # IndexedDB y offline
│   ├── excel.js       # Procesamiento Excel
│   └── supabase.js    # Cliente Supabase
├── pages/             # Páginas principales
│   ├── AdminDashboard.jsx
│   ├── LoginPage.jsx
│   ├── SupervisorDashboard.jsx
│   └── VendedorDashboard.jsx
├── App.jsx            # Componente raíz
├── main.jsx          # Punto de entrada
└── index.css         # Estilos globales
```

## 🚀 Despliegue

### GitHub Pages (Automático)

1. **Configurar secrets en GitHub**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Push a main branch**:
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

3. **GitHub Actions** ejecutará automáticamente el deploy

### Manual

```bash
npm run build
npm run deploy
```

## 🔒 Seguridad

### Row Level Security (RLS)

- **Vendedores**: Solo ven sus propias asignaciones
- **Supervisores**: Ven asignaciones de su zona
- **Admins**: Acceso completo

### Autenticación

- **Admins**: Supabase Auth con email/password
- **Vendedores/Supervisores**: Sistema simplificado por código
- **Tokens JWT** con claims personalizados

## 📱 PWA Features

### Offline Support
- Cache de datos críticos en IndexedDB
- Service Worker con estrategias de cache
- Banner de estado de conexión

### Instalación
- Manifest con iconos y shortcuts
- Instalable en móvil y escritorio
- Splash screen personalizada

## 🎨 UI/UX

### Características
- **Responsive**: Mobile-first design
- **Dark Mode**: Persistente con preferencia del sistema
- **Animaciones**: Micro-interacciones con Framer Motion
- **Accesibilidad**: ARIA labels y navegación por teclado

### Componentes
- Cards con hover effects
- Chips animados para estados
- Barras de progreso dinámicas
- Modales y overlays

## 🧪 Testing

### Datos de Prueba

El sistema incluye datos semilla:
- Usuario admin: `admin@empresa.com`
- Vendedores: E56, E57, E58
- Supervisores: SUP01, SUP02
- Clientes y categorías de ejemplo

## 📈 Monitoreo

### Métricas Disponibles
- Porcentaje de activación por vendedor
- Rendimiento por zona
- Categorías más faltantes
- Tendencias temporales

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch
3. Commit de cambios
4. Push al branch
5. Crear Pull Request

## 📄 Licencia

Este proyecto es de uso interno empresarial.

## 🆘 Soporte

Para soporte técnico, contactar al equipo de desarrollo.

---

**Desarrollado con ❤️ para la gestión comercial eficiente**
