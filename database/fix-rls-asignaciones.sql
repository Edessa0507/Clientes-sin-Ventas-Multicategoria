-- Script para corregir políticas RLS en tabla asignaciones
-- Permitir inserción desde el panel de administrador

-- Deshabilitar RLS temporalmente para inserción de datos
ALTER TABLE asignaciones DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "asignaciones_select_policy" ON asignaciones;
DROP POLICY IF EXISTS "asignaciones_insert_policy" ON asignaciones;
DROP POLICY IF EXISTS "asignaciones_update_policy" ON asignaciones;
DROP POLICY IF EXISTS "asignaciones_delete_policy" ON asignaciones;

-- Crear políticas permisivas para asignaciones
CREATE POLICY "asignaciones_select_policy" ON asignaciones
    FOR SELECT USING (true);

CREATE POLICY "asignaciones_insert_policy" ON asignaciones
    FOR INSERT WITH CHECK (true);

CREATE POLICY "asignaciones_update_policy" ON asignaciones
    FOR UPDATE USING (true);

CREATE POLICY "asignaciones_delete_policy" ON asignaciones
    FOR DELETE USING (true);

-- Rehabilitar RLS
ALTER TABLE asignaciones ENABLE ROW LEVEL SECURITY;

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'asignaciones';
