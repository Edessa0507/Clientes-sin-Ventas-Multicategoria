# PWA Clientes sin Ventas Multicategoría

Aplicación PWA para la gestión de clientes sin ventas por categorías, desarrollada con React, Vite, Tailwind CSS y Supabase.

## 🚀 Características

- **PWA Offline-First**: Funciona sin conexión a internet
- **3 Roles de Usuario**: Vendedor, Supervisor y Administrador
- **Autenticación Segura**: Login por código para vendedores/supervisores, email/password para admin
- **Dashboard Interactivo**: Métricas, gráficos y filtros personalizados
- **Importación Excel**: Carga masiva de datos con validación y preview
- **Responsive Design**: Optimizado para móviles y desktop
- **Modo Oscuro**: Interfaz adaptable

## 🛠️ Tecnologías

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **PWA**: Service Worker, IndexedDB (Dexie)
- **UI/UX**: Framer Motion, Lucide Icons, React Hot Toast
- **Charts**: Recharts
- **Excel**: SheetJS (xlsx)

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/Edessa0507/Clientes-sin-Ventas-Multicategoria.git
cd Clientes-sin-Ventas-Multicategoria
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```

4. Ejecuta la aplicación:
```bash
npm run dev
```

## 🗄️ Base de Datos

### Configuración Supabase

1. Ejecuta el esquema de base de datos:
```sql
-- Ejecutar database/schema.sql en Supabase SQL Editor
```

2. Inserta datos de ejemplo:
```sql
-- Ejecutar database/seeds.sql en Supabase SQL Editor
```

### Estructura de Datos

- **Zonas**: Regiones geográficas
- **Rutas**: Rutas de vendedores
- **Supervisores**: Gestores de zona
- **Vendedores**: Usuarios de campo
- **Clientes**: Base de clientes
- **Categorías**: Productos/servicios
- **Asignaciones**: Relación cliente-categoría

## 👥 Roles y Funcionalidades

### 🛒 Vendedor
- Login con código personal
- Vista de clientes asignados
- Estados por categoría (Activado/0/Falta)
- Filtros por cliente y categoría

### 👨‍💼 Supervisor
- Login con código de supervisor
- Vista agregada de vendedores
- Filtros por vendedor específico
- Estadísticas de zona/ruta

### 🔧 Administrador
- Login con email/password
- Dashboard completo con métricas
- Importación masiva desde Excel
- Gestión de usuarios
- Guía interactiva

## 📱 PWA Features

- **Instalable**: Se puede instalar como app nativa
- **Offline**: Funciona sin conexión
- **Cache Inteligente**: Datos sincronizados automáticamente
- **Notificaciones**: Estado de conexión y actualizaciones

## 🚀 Despliegue

La aplicación se despliega automáticamente en GitHub Pages mediante GitHub Actions.

### Variables de Entorno Requeridas

En GitHub Settings > Secrets and variables > Actions:

```
VITE_SUPABASE_URL=https://ualdsvobfonbmsuhmtsr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### URL de Producción

🌐 **[https://edessa0507.github.io/Clientes-sin-Ventas-Multicategoria/](https://edessa0507.github.io/Clientes-sin-Ventas-Multicategoria/)**

## 📊 Estructura del Proyecto

```
├── src/
│   ├── components/
│   │   ├── admin/          # Panel administrador
│   │   ├── auth/           # Autenticación
│   │   ├── supervisor/     # Dashboard supervisor
│   │   ├── vendedor/       # Dashboard vendedor
│   │   └── ui/             # Componentes UI
│   ├── context/            # Context API
│   ├── lib/                # Utilidades y servicios
│   └── App.jsx             # Componente principal
├── database/               # Esquemas SQL
├── public/                 # Assets estáticos
└── .github/workflows/      # CI/CD
```

## 🔒 Seguridad

- **RLS (Row Level Security)** en Supabase
- **Políticas de acceso** por rol
- **Variables de entorno** protegidas
- **Validación** en frontend y backend

## 📝 Usuarios de Prueba

### Vendedores
- **E56**: PEDRO JOSE BURGOS
- **E81**: YEURI ANTONIO PARDO ACOSTA
- **E02**: LUIS MANUEL DE LA CRUZ R.

### Supervisores
- **SUP001**: CARLOS VALDEZ
- **SUP002**: ISMAEL ZORRILLA
- **SUP003**: SEVERO ESCALANTE

### Administrador
- **Email**: admin@edessa.com
- **Password**: admin123

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico o consultas, contacta al equipo de desarrollo.

---

Desarrollado con ❤️ para EDESSA
