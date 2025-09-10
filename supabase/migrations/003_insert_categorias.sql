-- =====================================================
-- INSERTAR CATEGORÍAS DE PRODUCTOS
-- =====================================================

-- Insertar categorías de productos basadas en el Excel
INSERT INTO categorias (codigo, nombre, descripcion, activa, orden) VALUES
('ENSURE', 'ENSURE', 'Categoría de productos Ensure', true, 1),
('CHOCOLATE', 'CHOCOLATE', 'Categoría de productos Chocolate', true, 2),
('ALPINA', 'ALPINA', 'Categoría de productos Alpina', true, 3),
('SUPER_DE_ALIM', 'SUPER DE ALIM.', 'Categoría de productos Super de Alimentación', true, 4),
('CONDICIONATE', 'CONDICIONATE', 'Categoría de productos Condicionate', true, 5)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  activa = EXCLUDED.activa,
  orden = EXCLUDED.orden,
  updated_at = NOW();

-- Insertar zona por defecto si no existe
INSERT INTO zonas (codigo, nombre, descripcion, activa) VALUES
('DEFAULT', 'Zona Principal', 'Zona principal del sistema', true)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  activa = EXCLUDED.activa,
  updated_at = NOW();

-- Insertar ruta por defecto si no existe
INSERT INTO rutas (zona_id, codigo, nombre, descripcion, activa) 
SELECT 
  z.id,
  'DEFAULT',
  'Ruta Principal',
  'Ruta principal del sistema',
  true
FROM zonas z 
WHERE z.codigo = 'DEFAULT'
ON CONFLICT (zona_id, codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  activa = EXCLUDED.activa,
  updated_at = NOW();

-- Comentarios
COMMENT ON TABLE categorias IS 'Categorías de productos del sistema multicategoría';
COMMENT ON TABLE zonas IS 'Zonas geográficas de venta';
COMMENT ON TABLE rutas IS 'Rutas de venta dentro de cada zona';
