-- Crear usuario administrador ADMIN001
-- Contraseña: EdessA2748

-- OPCIÓN 1: Usar el dashboard de Supabase
-- Ve a Authentication > Users > Add user
-- Email: gustavo.reyes@edessa.do
-- Password: EdessA2748
-- Confirm password: EdessA2748

-- OPCIÓN 2: Usar SQL (ejecutar después de crear en dashboard)
-- Insertar en nuestra tabla auth_users
INSERT INTO auth_users (vendedor_codigo, nombre, email, rol, activo) VALUES
('ADMIN001', 'GUSTAVO REYES', 'gustavo.reyes@edessa.do', 'admin', true)
ON CONFLICT (vendedor_codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;
