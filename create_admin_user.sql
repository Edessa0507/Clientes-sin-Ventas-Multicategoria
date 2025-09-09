-- Crear usuario administrador
INSERT INTO auth_users (
    id,
    codigo,
    email,
    nombre_completo,
    rol,
    zona_id,
    supervisor_id,
    activo,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'ADMIN001',
    'gustavo.reyes@edessa.do',
    'GUSTAVO REYES',
    'admin',
    NULL, -- Los administradores no tienen zona específica
    NULL, -- Los administradores no tienen supervisor
    true,
    NOW(),
    NOW()
) ON CONFLICT (codigo) DO UPDATE SET
    email = EXCLUDED.email,
    nombre_completo = EXCLUDED.nombre_completo,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo,
    updated_at = NOW();

-- Verificar que el usuario se creó correctamente
SELECT 
    codigo,
    email,
    nombre_completo,
    rol,
    activo,
    created_at
FROM auth_users 
WHERE codigo = 'ADMIN001';
