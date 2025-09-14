-- Insertar datos de prueba para testing de login
-- Ejecutar después de production-setup.sql

-- Primero insertar zonas de prueba
INSERT INTO zonas (id, codigo, nombre, activa) VALUES 
(uuid_generate_v4(), 'ZONA01', 'Santo Domingo', true),
(uuid_generate_v4(), 'ZONA02', 'Santiago', true),
(uuid_generate_v4(), 'ZONA03', 'La Vega', true)
ON CONFLICT (codigo) DO NOTHING;

-- Insertar supervisores de prueba con zona_id
INSERT INTO supervisores (id, codigo, nombre_completo, zona_id, activo) VALUES 
(uuid_generate_v4(), 'SUP01', 'Carlos Valdez', (SELECT id FROM zonas WHERE codigo = 'ZONA01'), true),
(uuid_generate_v4(), 'SUP02', 'Ismael Zorrilla', (SELECT id FROM zonas WHERE codigo = 'ZONA01'), true),
(uuid_generate_v4(), 'SUP03', 'Severo Escalante', (SELECT id FROM zonas WHERE codigo = 'ZONA01'), true)
ON CONFLICT (codigo) DO NOTHING;

-- Insertar vendedores de prueba con zona_id y supervisor_id
INSERT INTO vendedores (id, codigo, nombre_completo, zona_id, supervisor_id, activo) VALUES 
(uuid_generate_v4(), 'E56', 'Pedro Jose Burgos', (SELECT id FROM zonas WHERE codigo = 'ZONA01'), (SELECT id FROM supervisores WHERE codigo = 'SUP01'), true),
(uuid_generate_v4(), 'E81', 'Yeuri Antonio Pardo Acosta', (SELECT id FROM zonas WHERE codigo = 'ZONA01'), (SELECT id FROM supervisores WHERE codigo = 'SUP02'), true),
(uuid_generate_v4(), 'E02', 'Luis Manuel de la Cruz R.', (SELECT id FROM zonas WHERE codigo = 'ZONA01'), (SELECT id FROM supervisores WHERE codigo = 'SUP03'), true)
ON CONFLICT (codigo) DO NOTHING;

-- Insertar algunos clientes de prueba
INSERT INTO clientes (id, codigo, nombre, activo) VALUES 
(uuid_generate_v4(), '61842', 'CASA NANDO', true),
(uuid_generate_v4(), '75599', 'CASA RUBIO', true),
(uuid_generate_v4(), '96832', 'COLMADO BOMBAYA', true),
(uuid_generate_v4(), '80188', 'CALLE AVELINO#50LOS COCO', true),
(uuid_generate_v4(), '35663', 'COLM. LOURDES', true)
ON CONFLICT (codigo) DO NOTHING;

-- Insertar categorías básicas
INSERT INTO categorias (id, codigo, nombre, activa) VALUES 
(uuid_generate_v4(), 'ENSURE', 'Ensure', true),
(uuid_generate_v4(), 'CHOCOLATE', 'Chocolate', true),
(uuid_generate_v4(), 'ALPINA', 'Alpina', true),
(uuid_generate_v4(), 'SUPER_ALIM', 'Super de Alim.', true)
ON CONFLICT (codigo) DO NOTHING;
