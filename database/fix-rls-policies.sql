-- Corregir políticas RLS para permitir acceso anónimo a consultas de login
-- Ejecutar después de production-setup.sql e insert-test-data.sql

-- 1. Deshabilitar RLS temporalmente para permitir acceso público
ALTER TABLE vendedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE supervisores DISABLE ROW LEVEL SECURITY;
ALTER TABLE administradores DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE zonas DISABLE ROW LEVEL SECURITY;
ALTER TABLE rutas DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Lectura pública de vendedores para login" ON vendedores;
DROP POLICY IF EXISTS "Lectura pública de supervisores para login" ON supervisores;
DROP POLICY IF EXISTS "Lectura pública de clientes" ON clientes;
DROP POLICY IF EXISTS "Lectura pública de categorias" ON categorias;
DROP POLICY IF EXISTS "Lectura pública de asignaciones" ON asignaciones;
DROP POLICY IF EXISTS "Lectura pública de zonas" ON zonas;
DROP POLICY IF EXISTS "Lectura pública de rutas" ON rutas;

-- 3. Crear políticas permisivas para acceso público
CREATE POLICY "allow_public_read" ON vendedores FOR SELECT USING (true);
CREATE POLICY "allow_public_read" ON supervisores FOR SELECT USING (true);
CREATE POLICY "allow_public_read" ON clientes FOR SELECT USING (true);
CREATE POLICY "allow_public_read" ON categorias FOR SELECT USING (true);
CREATE POLICY "allow_public_read" ON asignaciones FOR SELECT USING (true);
CREATE POLICY "allow_public_read" ON zonas FOR SELECT USING (true);
CREATE POLICY "allow_public_read" ON rutas FOR SELECT USING (true);

-- 4. Rehabilitar RLS con políticas permisivas
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;

-- 5. Administradores mantienen RLS deshabilitado para funciones RPC
-- ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;
