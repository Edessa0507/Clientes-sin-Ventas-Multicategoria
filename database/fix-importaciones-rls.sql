-- Script para corregir políticas RLS en tabla importaciones
-- Resolver errores 401/406 al acceder a importaciones

-- Verificar si existe la tabla importaciones
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'importaciones';

-- Deshabilitar RLS temporalmente
ALTER TABLE importaciones DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "importaciones_select_policy" ON importaciones;
DROP POLICY IF EXISTS "importaciones_insert_policy" ON importaciones;
DROP POLICY IF EXISTS "importaciones_update_policy" ON importaciones;
DROP POLICY IF EXISTS "importaciones_delete_policy" ON importaciones;

-- Crear políticas permisivas
CREATE POLICY "importaciones_select_policy" ON importaciones
    FOR SELECT USING (true);

CREATE POLICY "importaciones_insert_policy" ON importaciones
    FOR INSERT WITH CHECK (true);

CREATE POLICY "importaciones_update_policy" ON importaciones
    FOR UPDATE USING (true);

CREATE POLICY "importaciones_delete_policy" ON importaciones
    FOR DELETE USING (true);

-- Rehabilitar RLS
ALTER TABLE importaciones ENABLE ROW LEVEL SECURITY;

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'importaciones';
