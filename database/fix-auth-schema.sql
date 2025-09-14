-- Corrección del esquema para eliminar dependencias de auth.users
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar políticas que dependen de user_id PRIMERO
DROP POLICY IF EXISTS "Vendedores pueden ver sus propios datos" ON vendedores;
DROP POLICY IF EXISTS "Supervisores pueden ver sus propios datos" ON supervisores;
DROP POLICY IF EXISTS "Supervisores pueden ver sus vendedores" ON vendedores;
DROP POLICY IF EXISTS "Supervisores pueden ver asignaciones de sus vendedores" ON asignaciones;

-- 2. Ahora eliminar las columnas user_id
ALTER TABLE supervisores DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE vendedores DROP COLUMN IF EXISTS user_id CASCADE;

-- 3. Crear nuevas políticas basadas solo en códigos
CREATE POLICY "Vendedores pueden ver sus propios datos" ON vendedores
    FOR SELECT USING (
        codigo = current_setting('app.current_user_codigo', true)
    );

CREATE POLICY "Supervisores pueden ver sus propios datos" ON supervisores
    FOR SELECT USING (
        codigo = current_setting('app.current_user_codigo', true)
    );

-- 4. Verificar que las políticas públicas existan para el login
DROP POLICY IF EXISTS "Lectura pública de vendedores para login" ON vendedores;
DROP POLICY IF EXISTS "Lectura pública de supervisores para login" ON supervisores;

CREATE POLICY "Lectura pública de vendedores para login" ON vendedores
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de supervisores para login" ON supervisores
    FOR SELECT USING (true);

-- 5. Asegurar que las tablas existan con la estructura correcta
CREATE TABLE IF NOT EXISTS supervisores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(200) NOT NULL,
    zona_id UUID NOT NULL REFERENCES zonas(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(200) NOT NULL,
    zona_id UUID NOT NULL REFERENCES zonas(id),
    supervisor_id UUID REFERENCES supervisores(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
