-- Crear tabla rutas
CREATE TABLE IF NOT EXISTS rutas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar campo ruta a asignaciones si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'asignaciones' AND column_name = 'ruta_codigo') THEN
    ALTER TABLE asignaciones ADD COLUMN ruta_codigo VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'asignaciones' AND column_name = 'ruta_nombre') THEN
    ALTER TABLE asignaciones ADD COLUMN ruta_nombre VARCHAR(200);
  END IF;
END $$;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_asignaciones_ruta_codigo ON asignaciones(ruta_codigo);
CREATE INDEX IF NOT EXISTS idx_rutas_codigo ON rutas(codigo);
CREATE INDEX IF NOT EXISTS idx_rutas_activa ON rutas(activa);

-- Habilitar RLS para rutas
ALTER TABLE rutas ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Allow read access to rutas" ON rutas
  FOR SELECT USING (true);

-- Política para permitir escritura solo a admins
CREATE POLICY "Allow admin write access to rutas" ON rutas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'gustavo.reyes@edessa.do'
    )
  );

COMMENT ON TABLE rutas IS 'Tabla de rutas para organizar clientes por zona geográfica';
COMMENT ON COLUMN rutas.codigo IS 'Código único de la ruta';
COMMENT ON COLUMN rutas.nombre IS 'Nombre descriptivo de la ruta';
COMMENT ON COLUMN asignaciones.ruta_codigo IS 'Código de ruta desnormalizado para consultas rápidas';
COMMENT ON COLUMN asignaciones.ruta_nombre IS 'Nombre de ruta desnormalizado para consultas rápidas';
