# 🚀 Configuración para Producción - EDESSA PWA

## 📋 Pasos para configurar la base de datos real

### 1. Ejecutar Migraciones en Supabase

Ve a tu dashboard de Supabase: https://supabase.com/dashboard/project/xaohatfpnsoszduxgdyp

**SQL Editor > New Query** y ejecuta el contenido de:
```
supabase/migrations/001_initial_schema.sql
```

### 2. Insertar Datos Iniciales

En el mismo SQL Editor, ejecuta el contenido de:
```
supabase/seed.sql
```

### 3. Configurar Variables de Entorno en Supabase

Ve a **Settings > Edge Functions** y configura estas variables:

```
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
JWT_SECRET=tu_jwt_secret_aqui
```

Para obtener estas claves:
- **Service Role Key**: Settings > API > service_role (secret)
- **JWT Secret**: Settings > API > JWT Settings > JWT Secret

### 4. Desplegar Edge Functions

Necesitas instalar Supabase CLI:

```bash
# Windows (PowerShell como administrador)
winget install Supabase.CLI

# O usando npm
npm install -g supabase
```

Luego ejecutar:
```bash
supabase login
supabase functions deploy auth-code-login --project-ref xaohatfpnsoszduxgdyp
supabase functions deploy excel-import --project-ref xaohatfpnsoszduxgdyp  
supabase functions deploy apply-import --project-ref xaohatfpnsoszduxgdyp
```

### 5. Actualizar Frontend para Producción

Una vez configurado Supabase, el frontend se conectará automáticamente usando las credenciales del archivo `.env`.

## 🔧 Verificación

Después de ejecutar los pasos anteriores:

1. **Verificar tablas**: Ve a Table Editor en Supabase y confirma que tienes:
   - auth_users
   - vendedores  
   - zonas
   - rutas
   - clientes
   - categorias
   - asignaciones
   - import_runs
   - import_staging

2. **Verificar datos**: Deberías ver datos de ejemplo en todas las tablas

3. **Verificar Edge Functions**: Ve a Edge Functions y confirma que están desplegadas:
   - auth-code-login
   - excel-import
   - apply-import

## 🎯 Usuarios de Prueba

Una vez configurado, puedes usar estos usuarios:

**Administrador:**
- Usuario: `admin`
- Contraseña: `admin123`

**Vendedores:**
- `E56 - (PREV) PEDRO JOSE BURGOS`
- `E78 - (PREV) MARIA GONZALEZ`
- `E92 - (PREV) CARLOS RODRIGUEZ`

**Supervisores:**
- `S01 - SUPERVISOR ZONA NORTE`
- `S02 - SUPERVISOR ZONA SUR`

## ⚠️ Importante

Después de configurar la base de datos, necesito actualizar el `authStore.ts` para usar Supabase real en lugar de datos simulados.

¿Quieres que proceda con la configuración manual o prefieres instalar Supabase CLI?
