# Guía de Despliegue - Generador de Clientes sin Ventas

## 📋 Requisitos Previos

1. **Cuenta de Supabase**
   - Crear proyecto en [supabase.com](https://supabase.com)
   - Obtener URL del proyecto y Anon Key

2. **Cuenta de GitHub**
   - Repositorio público o privado
   - GitHub Pages habilitado

## 🗄️ Configuración de Supabase

### Paso 1: Crear Proyecto
1. Ir a [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Anotar la URL y Anon Key

### Paso 2: Ejecutar Schema SQL
1. Ir a SQL Editor en Supabase
2. Copiar y ejecutar todo el contenido de `supabase-schema.sql`
3. Verificar que se crearon las tablas:
   - `auth_users`
   - `clientes` 
   - `categorias`
   - `asignaciones`
   - `import_runs`

### Paso 3: Verificar RLS
1. Ir a Authentication > Policies
2. Confirmar que todas las tablas tienen políticas RLS activas
3. Verificar que RLS está habilitado en todas las tablas

### Paso 4: Datos de Prueba
Los datos semilla se insertan automáticamente:
- **Admin**: `admin@empresa.com` / contraseña a definir
- **Vendedores**: E56, E57, E58
- **Supervisores**: SUP01, SUP02

## 🚀 Despliegue en GitHub Pages

### Paso 1: Subir Código
```bash
# Inicializar repositorio
git init
git add .
git commit -m "Initial commit"

# Conectar con GitHub
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
git push -u origin main
```

### Paso 2: Configurar Secrets
En GitHub, ir a Settings > Secrets and variables > Actions:

1. **VITE_SUPABASE_URL**
   ```
   https://tu-proyecto.supabase.co
   ```

2. **VITE_SUPABASE_ANON_KEY**
   ```
   tu-anon-key-de-supabase
   ```

### Paso 3: Habilitar GitHub Pages
1. Ir a Settings > Pages
2. Source: "GitHub Actions"
3. El workflow se ejecutará automáticamente

### Paso 4: Verificar Despliegue
- URL: `https://tu-usuario.github.io/tu-repositorio/`
- El deploy toma 2-5 minutos

## 🔧 Configuración Local

### Desarrollo Local
```bash
# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Editar .env con tus credenciales
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Ejecutar en desarrollo
npm run dev
```

### Build Local
```bash
# Generar build de producción
npm run build

# Vista previa del build
npm run preview
```

## 👥 Configuración de Usuarios

### Crear Usuario Admin en Supabase
1. Ir a Authentication > Users
2. Crear nuevo usuario con email/password
3. El sistema lo detectará automáticamente como admin

### Agregar Vendedores/Supervisores
Ejecutar en SQL Editor:
```sql
INSERT INTO auth_users (vendedor_codigo, nombre, rol, zona, rutas) VALUES 
('TU_CODIGO', 'TU NOMBRE', 'vendedor', 'TU_ZONA', ARRAY['TU_RUTA']);
```

## 📊 Importación de Datos

### Formato Excel Requerido
```
SUPERVISOR | VENDEDOR | RUTA | CLIENTE | CATEGORIA1 | CATEGORIA2 | ...
SUP01 | E56 - PEDRO BURGOS | 1L - Lunes 1x | 61842 - CASA NANDO | Activado | FALTA | ...
```

### Proceso de Importación
1. Login como admin
2. Ir a "Importar Excel"
3. Seleccionar fecha del reporte
4. Arrastrar archivo Excel
5. Revisar vista previa
6. Aplicar importación

## 🔒 Seguridad

### Variables de Entorno
- **NUNCA** commitear archivos `.env`
- Usar GitHub Secrets para producción
- Rotar keys periódicamente

### RLS Policies
- Vendedores solo ven sus datos
- Supervisores ven su zona
- Admins tienen acceso completo

## 🐛 Solución de Problemas

### Error: "Failed to fetch"
- Verificar URL de Supabase
- Verificar Anon Key
- Revisar políticas RLS

### Error: "Access denied"
- Verificar que el usuario existe en `auth_users`
- Verificar rol asignado
- Revisar políticas RLS

### Build Falla
- Verificar que todas las dependencias están instaladas
- Revisar errores de TypeScript/ESLint
- Verificar variables de entorno

### PWA No Se Instala
- Verificar que `manifest.json` es válido
- Verificar que se sirve sobre HTTPS
- Revisar Service Worker

## 📱 Pruebas

### Credenciales de Prueba
- **Admin**: Crear en Supabase Auth
- **Vendedor**: Código `E56`
- **Supervisor**: Código `SUP01`

### Casos de Prueba
1. Login con diferentes roles
2. Importación de Excel
3. Filtros y búsquedas
4. Modo offline
5. Instalación PWA

## 🔄 Actualizaciones

### Deploy Automático
- Push a `main` ejecuta deploy automático
- Revisar Actions tab para estado

### Deploy Manual
```bash
npm run build
npm run deploy
```

## 📞 Soporte

### Logs y Debugging
- Console del navegador para errores frontend
- Supabase Dashboard > Logs para errores backend
- GitHub Actions para errores de deploy

### Contacto
Para soporte técnico, contactar al equipo de desarrollo con:
- URL del sitio
- Pasos para reproducir el problema
- Screenshots si es necesario

---

**¡Despliegue completado! 🎉**
