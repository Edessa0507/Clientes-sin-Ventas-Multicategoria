-- Configuración para producción - Usar datos reales de Supabase
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar políticas que dependen de user_id PRIMERO
DROP POLICY IF EXISTS "Vendedores pueden ver sus propios datos" ON vendedores;
DROP POLICY IF EXISTS "Supervisores pueden ver sus propios datos" ON supervisores;
DROP POLICY IF EXISTS "Supervisores pueden ver sus vendedores" ON vendedores;
DROP POLICY IF EXISTS "Supervisores pueden ver asignaciones de sus vendedores" ON asignaciones;

-- 2. Eliminar las columnas user_id
ALTER TABLE supervisores DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE vendedores DROP COLUMN IF EXISTS user_id CASCADE;

-- 3. Crear tabla administradores si no existe
CREATE TABLE IF NOT EXISTS administradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insertar administrador real
INSERT INTO administradores (email, password_hash, nombre_completo) 
VALUES ('gustavo.reyes@edessa.do', crypt('EdessA2748', gen_salt('bf')), 'Gustavo Reyes')
ON CONFLICT (email) DO UPDATE SET 
    password_hash = crypt('EdessA2748', gen_salt('bf')),
    nombre_completo = 'Gustavo Reyes';

-- 5. Habilitar extensión para encriptación si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 6. Recrear políticas RLS simplificadas
CREATE POLICY "Lectura pública de vendedores para login" ON vendedores
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de supervisores para login" ON supervisores
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de administradores para login" ON administradores
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de clientes" ON clientes
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de categorías" ON categorias
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de asignaciones" ON asignaciones
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de zonas" ON zonas
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de rutas" ON rutas
    FOR SELECT USING (true);

-- 7. Eliminar datos de prueba si existen
DELETE FROM asignaciones WHERE vendedor_id IN (
    SELECT id FROM vendedores WHERE codigo IN ('E56', 'E81', 'E02')
);
DELETE FROM vendedores WHERE codigo IN ('E56', 'E81', 'E02');
DELETE FROM supervisores WHERE codigo IN ('SUP001', 'SUP002', 'SUP003');

-- 8. Función para validar login de administrador
CREATE OR REPLACE FUNCTION validate_admin_login(email_input TEXT, password_input TEXT)
RETURNS TABLE(id UUID, email TEXT, nombre_completo TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.email, a.nombre_completo
    FROM administradores a
    WHERE a.email = email_input 
    AND a.password_hash = crypt(password_input, a.password_hash)
    AND a.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
