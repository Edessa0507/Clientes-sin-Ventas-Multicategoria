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

-- 3. Hacer user_id opcional en administradores (para permitir admin sin auth.users)
ALTER TABLE administradores ALTER COLUMN user_id DROP NOT NULL;

-- 4. Agregar columnas email y password_hash a tabla administradores existente
ALTER TABLE administradores 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 5. Insertar administrador real con contraseña encriptada (sin user_id)
INSERT INTO administradores (email, password_hash, nombre_completo) 
VALUES ('gustavo.reyes@edessa.do', crypt('EdessA2748', gen_salt('bf')), 'Gustavo Reyes')
ON CONFLICT (email) DO NOTHING;

-- 6. Hacer email NOT NULL después del INSERT
ALTER TABLE administradores ALTER COLUMN email SET NOT NULL;

-- 5. Habilitar extensión para encriptación si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 6. Eliminar políticas existentes antes de recrear
DROP POLICY IF EXISTS "Lectura pública de vendedores para login" ON vendedores;
DROP POLICY IF EXISTS "Lectura pública de supervisores para login" ON supervisores;
DROP POLICY IF EXISTS "Lectura pública de clientes" ON clientes;
DROP POLICY IF EXISTS "Lectura pública de categorias" ON categorias;
DROP POLICY IF EXISTS "Lectura pública de asignaciones" ON asignaciones;

-- 7. Recrear políticas RLS simplificadas
CREATE POLICY "Lectura pública de vendedores para login" ON vendedores
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de supervisores para login" ON supervisores
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de clientes" ON clientes
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de categorias" ON categorias
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de asignaciones" ON asignaciones
    FOR SELECT USING (true);

-- Eliminar políticas de zonas y rutas si existen
DROP POLICY IF EXISTS "Lectura pública de zonas" ON zonas;
DROP POLICY IF EXISTS "Lectura pública de rutas" ON rutas;

CREATE POLICY "Lectura pública de zonas" ON zonas
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de rutas" ON rutas
    FOR SELECT USING (true);

-- 7. NO eliminar datos - mantener datos existentes para pruebas
-- Los datos reales deben existir en las tablas para que funcione el login
-- DELETE FROM asignaciones WHERE vendedor_id IN (
--     SELECT id FROM vendedores WHERE codigo IN ('E56', 'E81', 'E02')
-- );
-- DELETE FROM vendedores WHERE codigo IN ('E56', 'E81', 'E02');
-- DELETE FROM supervisores WHERE codigo IN ('SUP001', 'SUP002', 'SUP003');

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
