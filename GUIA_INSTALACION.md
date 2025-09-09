# 🚀 Guía de Instalación y Pruebas - PWA Generador de Clientes

## 📋 Pasos para probar la aplicación

### 1. **Instalar dependencias**
```bash
npm install
```

### 2. **Configurar la base de datos en Supabase**

#### a) Ejecutar las migraciones SQL
1. Ve a tu proyecto Supabase: https://xaohatfpnsoszduxgdyp.supabase.co
2. Navega a **SQL Editor**
3. Copia y pega el contenido de `supabase/migrations/001_initial_schema.sql`
4. Ejecuta el script

#### b) Insertar datos de ejemplo
1. En el mismo SQL Editor
2. Copia y pega el contenido de `supabase/seed.sql`
3. Ejecuta el script

### 3. **Ejecutar la aplicación en desarrollo**
```bash
npm run dev
```

La aplicación se abrirá en: http://localhost:3000

### 4. **Probar los diferentes roles**

#### 🔑 **Vendedor** (Login por código)
- **Código:** `E001`
- **Nombre autocompletado:** `(PREV) PEDRO JOSE BURGOS`
- **Funcionalidad:** Ver clientes asignados y progreso de categorías

#### 🔑 **Supervisor** (Login por código)
- **Código:** `S001`
- **Nombre autocompletado:** `MARIA RODRIGUEZ SUPERVISOR`
- **Funcionalidad:** Vista agregada por zona y vendedores

#### 🔑 **Administrador** (Login con contraseña)
- **Email:** `admin@edessa.com`
- **Contraseña:** Necesitas configurarla en Supabase Auth
- **Funcionalidad:** Carga de Excel, gestión de usuarios

### 5. **Configurar usuario administrador**
1. Ve a **Authentication > Users** en Supabase
2. Crea un nuevo usuario con email: `admin@edessa.com`
3. Asigna una contraseña temporal
4. El usuario ya está configurado en la base de datos

## 🔧 Comandos disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Vista previa del build
npm run preview

# Linting
npm run lint

# Formateo de código
npm run format

# Pruebas
npm run test
```

## 📱 Funcionalidades a probar

### **Panel de Vendedor**
- ✅ Login con código E001, E002, E003
- ✅ Vista de clientes con progreso de categorías
- ✅ Filtros por cliente y estado
- ✅ Indicadores visuales animados
- ✅ Estadísticas en tiempo real

### **Panel de Supervisor**
- ✅ Login con código S001, S002
- ✅ Vista agregada por zona
- ✅ Selección de vendedores

### **Panel de Administración**
- ✅ Login con email/contraseña
- ✅ Carga de archivos Excel (drag & drop)
- ✅ Historial de importaciones
- ✅ Gestión de usuarios

### **Funcionalidades PWA**
- ✅ Instalable como app
- ✅ Indicador offline/online
- ✅ Diseño responsive
- ✅ Modo oscuro automático

## 🐛 Solución de problemas

### Error de conexión a Supabase
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que las migraciones SQL se ejecutaron correctamente

### Error en el login de vendedor
- Verifica que los datos de ejemplo se insertaron correctamente
- Los códigos válidos son: E001, E002, E003, S001, S002

### Error en el login de admin
- Crea el usuario en Supabase Auth con email `admin@edessa.com`
- Asigna una contraseña en el panel de Supabase

## 📊 Datos de ejemplo incluidos

- **4 Zonas:** Norte, Sur, Este, Oeste
- **6 Rutas:** Distribuidas por zonas
- **8 Categorías:** Lácteos, Carnes, Panadería, etc.
- **10 Vendedores:** Con códigos E001-E010
- **4 Supervisores:** Con códigos S001-S004
- **12 Clientes:** Distribuidos por zonas
- **Asignaciones:** Relaciones vendedor-cliente-categoría con estados

## 🌐 Próximos pasos

1. **Configurar Edge Functions** para funcionalidad completa
2. **Implementar Service Worker** para modo offline
3. **Configurar despliegue** en Netlify
4. **Personalizar** con datos reales de EDESSA
