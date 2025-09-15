-- Script seguro para corregir estructuras de tablas vendedores y supervisores
-- Ejecutar en Supabase SQL Editor (evita conflictos con datos existentes)

-- 1. Verificar estructura actual de vendedores
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'vendedores' 
ORDER BY ordinal_position;

-- 2. Verificar estructura actual de supervisores  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'supervisores' 
ORDER BY ordinal_position;

-- 3. Agregar columnas faltantes a vendedores si no existen
DO $$ 
BEGIN
    -- Agregar email si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendedores' AND column_name = 'email') THEN
        ALTER TABLE vendedores ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Agregar nombre_completo si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendedores' AND column_name = 'nombre_completo') THEN
        ALTER TABLE vendedores ADD COLUMN nombre_completo VARCHAR(200);
    END IF;
    
    -- Agregar activo si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendedores' AND column_name = 'activo') THEN
        ALTER TABLE vendedores ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. Agregar columnas faltantes a supervisores si no existen
DO $$ 
BEGIN
    -- Agregar email si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supervisores' AND column_name = 'email') THEN
        ALTER TABLE supervisores ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Agregar nombre_completo si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supervisores' AND column_name = 'nombre_completo') THEN
        ALTER TABLE supervisores ADD COLUMN nombre_completo VARCHAR(200);
    END IF;
    
    -- Agregar activo si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supervisores' AND column_name = 'activo') THEN
        ALTER TABLE supervisores ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;
    
    -- Agregar codigo si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supervisores' AND column_name = 'codigo') THEN
        ALTER TABLE supervisores ADD COLUMN codigo VARCHAR(50);
    END IF;
END $$;

-- 5. Solo insertar vendedores que NO existan (verificar si hay datos en asignaciones primero)
DO $$
BEGIN
    -- Solo ejecutar si existe la tabla asignaciones con datos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asignaciones') AND 
       EXISTS (SELECT 1 FROM asignaciones LIMIT 1) THEN
       
        -- Insertar vendedores únicos desde asignaciones
        INSERT INTO vendedores (codigo, nombre_completo, activo)
        SELECT DISTINCT 
            TRIM(UPPER(vendedor_codigo)) as codigo,
            TRIM(vendedor_nombre) as nombre_completo,
            true as activo
        FROM asignaciones 
        WHERE vendedor_codigo IS NOT NULL 
        AND vendedor_codigo != ''
        AND NOT EXISTS (
            SELECT 1 FROM vendedores v 
            WHERE v.codigo = TRIM(UPPER(asignaciones.vendedor_codigo))
        );
        
    END IF;
END $$;

-- 6. Solo insertar supervisores que NO existan y NO tengan email duplicado
DO $$
BEGIN
    -- Solo ejecutar si existe la tabla asignaciones con datos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asignaciones') AND 
       EXISTS (SELECT 1 FROM asignaciones LIMIT 1) THEN
       
        -- Insertar supervisores únicos desde asignaciones (solo los que no existan)
        INSERT INTO supervisores (codigo, nombre_completo, activo, email)
        SELECT DISTINCT 
            TRIM(UPPER(supervisor_codigo)) as codigo,
            TRIM(supervisor_nombre) as nombre_completo,
            true as activo,
            -- Generar emails únicos para supervisores nuevos
            CASE 
                WHEN TRIM(supervisor_nombre) ILIKE '%CARLOS VALDEZ%' AND 
                     NOT EXISTS (SELECT 1 FROM supervisores WHERE email = 'cvaldez@edessa.com.do') 
                     THEN 'cvaldez@edessa.com.do'
                WHEN TRIM(supervisor_nombre) ILIKE '%ISMAEL ZORRILLA%' AND 
                     NOT EXISTS (SELECT 1 FROM supervisores WHERE email = 'ismael.zorrilla@edessa.do') 
                     THEN 'ismael.zorrilla@edessa.do'
                WHEN TRIM(supervisor_nombre) ILIKE '%SEVERO ESCALANTE%' AND 
                     NOT EXISTS (SELECT 1 FROM supervisores WHERE email = 'severo.escalante@edessa.do') 
                     THEN 'severo.escalante@edessa.do'
                ELSE LOWER(REPLACE(TRIM(supervisor_nombre), ' ', '.')) || '.' || TRIM(UPPER(supervisor_codigo)) || '@edessa.do'
            END as email
        FROM asignaciones 
        WHERE supervisor_codigo IS NOT NULL 
        AND supervisor_codigo != ''
        AND NOT EXISTS (
            SELECT 1 FROM supervisores s 
            WHERE s.codigo = TRIM(UPPER(asignaciones.supervisor_codigo))
        );
        
    END IF;
END $$;

-- 7. Actualizar registros existentes con activo = true
UPDATE vendedores SET activo = true WHERE activo IS NULL;
UPDATE supervisores SET activo = true WHERE activo IS NULL;

-- 8. Verificar resultados
SELECT 'vendedores' as tabla, COUNT(*) as total FROM vendedores;
SELECT 'supervisores' as tabla, COUNT(*) as total FROM supervisores;

-- 9. Mostrar muestra de datos
SELECT 'VENDEDORES' as tipo, codigo, nombre_completo, activo FROM vendedores LIMIT 5;
SELECT 'SUPERVISORES' as tipo, codigo, nombre_completo, email, activo FROM supervisores LIMIT 5;
