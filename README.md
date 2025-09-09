# PWA Generador de Clientes sin Ventas Multicategoría

## Descripción General

Aplicación web progresiva (PWA) offline-first que permite a vendedores visualizar el progreso de activación de categorías por cliente, con panel administrativo para carga diaria de datos desde Excel.

## Arquitectura de la Solución

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend PWA  │    │   Supabase       │    │   Netlify       │
│                 │    │                  │    │                 │
│ • React + Vite  │◄──►│ • PostgreSQL     │    │ • Static Host   │
│ • Tailwind CSS  │    │ • Auth + RLS     │    │ • Edge Functions│
│ • Service Worker│    │ • Edge Functions │    │ • Environment   │
│ • IndexedDB     │    │ • Storage        │    │   Variables     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Funcionalidades Principales

### Por Rol de Usuario

#### 🔑 Vendedor
- Login por código (ej: "E56" → autocompleta "(PREV) PEDRO JOSE BURGOS")
- Vista de clientes asignados con progreso de categorías
- Filtros por zona, ruta, cliente
- Indicadores visuales modernos (íconos animados en lugar de texto)
- Funcionalidad offline completa

#### 👥 Supervisor
- Login por código con rol supervisor
- Vista agregada por zona/ruta
- Selección de vendedor específico o "todos"
- Dashboard de progreso general

#### ⚙️ Administrador
- Login con contraseña
- Carga diaria de Excel con validación
- Vista previa de cambios antes de aplicar
- Reemplazo atómico de datos
- Auditoría completa de importaciones
- Gestión de usuarios y roles

## Stack Tecnológico

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **PWA**: Service Worker + IndexedDB (Dexie)
- **Despliegue**: Netlify (Frontend) + Supabase (Backend)
- **Procesamiento**: SheetJS para Excel, Zod para validación

## Estructura del Proyecto

```
├── src/
│   ├── components/          # Componentes React reutilizables
│   ├── pages/              # Páginas principales por rol
│   ├── hooks/              # Custom hooks
│   ├── services/           # APIs y servicios
│   ├── stores/             # Estado global (Zustand)
│   ├── types/              # Definiciones TypeScript
│   ├── utils/              # Utilidades y helpers
│   └── workers/            # Service Worker
├── supabase/
│   ├── migrations/         # Migraciones SQL
│   ├── functions/          # Edge Functions
│   └── seed.sql           # Datos iniciales
├── public/
│   ├── manifest.json      # PWA Manifest
│   └── sw.js             # Service Worker
└── docs/                  # Documentación
```

## Modelo de Datos

### Tablas Principales

1. **auth_users** - Usuarios del sistema
2. **vendedores** - Información de vendedores
3. **supervisores** - Información de supervisores
4. **zonas** - Zonas geográficas
5. **rutas** - Rutas de venta
6. **clientes** - Clientes del sistema
7. **categorias** - Categorías de productos
8. **asignaciones** - Relación vendedor-cliente-categoría
9. **estados_activacion** - Estados de activación por categoría
10. **import_runs** - Auditoría de importaciones

### Flujo de Datos Excel

```
Excel → Validación → Staging → Vista Previa → Aplicación Atómica → Auditoría
```

## Seguridad

### Row Level Security (RLS)
- **Vendedores**: Solo ven sus clientes asignados
- **Supervisores**: Solo ven vendedores de sus zonas
- **Administradores**: Acceso completo

### Autenticación
- **Vendedores/Supervisores**: Login por código sin contraseña
- **Administradores**: Login tradicional con email/contraseña
- JWT con claims personalizados para roles y permisos

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- Cuenta de Supabase
- Cuenta de Netlify

### Variables de Entorno

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Configuración
VITE_APP_NAME="Generador de Clientes"
VITE_DEFAULT_SHEET_NAME="CLIENTES SIN VENT MULTICATEGORI"
```

### Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build para producción
npm run build

# Ejecutar pruebas
npm run test

# Linting y formato
npm run lint
npm run format
```

## Despliegue

### 1. Configurar Supabase
```bash
# Ejecutar migraciones
supabase db push

# Desplegar Edge Functions
supabase functions deploy
```

### 2. Configurar Netlify
```bash
# Build y deploy
npm run build
netlify deploy --prod --dir=dist
```

## Funcionalidades Offline

- **Cache de Assets**: Estrategia CacheFirst con versionado
- **Cache de Datos**: StaleWhileRevalidate con TTL configurable
- **Sincronización**: Cola de acciones pendientes con backoff exponencial
- **Indicadores**: Banner de estado de conexión

## Pruebas

### Tipos de Pruebas
- **Unitarias**: Validación, parsing, normalización
- **Integración**: RLS, vistas, Edge Functions
- **E2E**: Flujos completos por rol

### Ejecutar Pruebas
```bash
# Todas las pruebas
npm run test

# Pruebas unitarias
npm run test:unit

# Pruebas de integración
npm run test:integration

# Pruebas E2E
npm run test:e2e
```

## Criterios de Aceptación

✅ Login por código con autocompletado seguro del nombre
✅ Importación diaria con reemplazo atómico y auditoría
✅ RLS que previene accesos cruzados entre roles
✅ PWA funcional offline con sincronización automática
✅ UI moderna con micro-interacciones y accesibilidad
✅ Despliegue exitoso en free tier (Netlify + Supabase)

## Soporte y Mantenimiento

- **Logs**: Centralizados en Supabase con niveles de severidad
- **Monitoreo**: Métricas de uso y rendimiento
- **Backups**: Snapshots automáticos de datos históricos
- **Rollbacks**: Capacidad de revertir importaciones

## Contacto

Para soporte técnico o consultas sobre el proyecto, contactar al equipo de Ingeniería de Datos de EDESSA.
