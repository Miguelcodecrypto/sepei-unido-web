-- Script para cambiar el tipo de columna user_id en tabla votos
-- De UUID a VARCHAR para permitir almacenar DNI

-- PASO 1: Eliminar todos los votos existentes (si hay alguno)
-- Esto es necesario porque no se puede convertir UUID a VARCHAR directamente
TRUNCATE TABLE votos CASCADE;

-- PASO 2: Cambiar el tipo de columna de UUID a VARCHAR
ALTER TABLE votos 
ALTER COLUMN user_id TYPE VARCHAR(50) USING user_id::VARCHAR;

-- PASO 3: Verificar el cambio
SELECT 
    column_name, 
    data_type, 
    character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'votos' AND column_name = 'user_id';

-- Ahora la columna user_id puede almacenar DNIs como "48380884Q"
