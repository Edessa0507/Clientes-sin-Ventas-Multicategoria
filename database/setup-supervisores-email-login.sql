-- Script para configurar login de supervisores por email sin contraseña
-- Crear supervisores con emails específicos

-- Limpiar supervisores existentes
DELETE FROM supervisores;

-- Crear supervisores con emails
INSERT INTO supervisores (id, codigo, nombre_completo, email, activo, created_at) VALUES
(gen_random_uuid(), 'CVALDEZ', 'CARLOS VALDEZ (Sto. Dom.)', 'cvaldez@edessa.com.do', true, NOW()),
(gen_random_uuid(), 'IZORRILLA', 'ISMAEL ZORRILLA (Sto. Dom.)', 'ismael.zorrilla@edessa.do', true, NOW()),
(gen_random_uuid(), 'SESCALANTE', 'SEVERO ESCALANTE (Sto. Dom.)', 'severo.escalante@edessa.do', true, NOW());

-- Agregar columna email si no existe
ALTER TABLE supervisores ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Actualizar emails para supervisores existentes
UPDATE supervisores SET email = 'cvaldez@edessa.com.do' WHERE UPPER(nombre_completo) LIKE '%CARLOS VALDEZ%';
UPDATE supervisores SET email = 'ismael.zorrilla@edessa.do' WHERE UPPER(nombre_completo) LIKE '%ISMAEL ZORRILLA%';
UPDATE supervisores SET email = 'severo.escalante@edessa.do' WHERE UPPER(nombre_completo) LIKE '%SEVERO ESCALANTE%';

-- Verificar supervisores creados
SELECT codigo, nombre_completo, email, activo FROM supervisores ORDER BY nombre_completo;
