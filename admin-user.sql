-- Crear usuario administrador ADMIN001
-- Contraseña: EdessA2748

-- Primero, crear el usuario en Supabase Auth
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'gustavo.reyes@edessa.do',
    crypt('EdessA2748', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Luego, insertar en nuestra tabla auth_users
INSERT INTO auth_users (codigo, nombre, email, password_hash, rol, activo) VALUES
('ADMIN001', 'GUSTAVO REYES', 'gustavo.reyes@edessa.do', crypt('EdessA2748', gen_salt('bf')), 'admin', true)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;
