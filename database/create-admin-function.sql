-- Crear función RPC para validar login de administrador
-- Ejecutar en Supabase SQL Editor

-- 1. Habilitar extensión pgcrypto si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Eliminar función si existe
DROP FUNCTION IF EXISTS validate_admin_login(TEXT, TEXT);

-- 3. Crear función validate_admin_login
CREATE OR REPLACE FUNCTION validate_admin_login(email_input TEXT, password_input TEXT)
RETURNS TABLE(id UUID, email VARCHAR(255), nombre_completo VARCHAR(200)) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.email, a.nombre_completo
    FROM administradores a
    WHERE a.email = email_input 
    AND a.password_hash = crypt(password_input, a.password_hash)
    AND a.activo = true;
END;
$$;

-- 4. Dar permisos de ejecución a anon y authenticated
GRANT EXECUTE ON FUNCTION validate_admin_login(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_admin_login(TEXT, TEXT) TO authenticated;

-- 5. Verificar que la función existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'validate_admin_login';

-- 6. Probar la función con datos reales
SELECT * FROM validate_admin_login('gustavo.reyes@edessa.do', 'EdessA2748');
