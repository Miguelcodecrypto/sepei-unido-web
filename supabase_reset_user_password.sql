-- Script para resetear la contraseña de un usuario específico
-- Útil cuando la contraseña temporal no coincide con la guardada

-- PASO 1: Generar un nuevo hash bcrypt para una contraseña temporal conocida
-- Puedes usar https://bcrypt-generator.com/ con rounds=10
-- Por ejemplo, para la contraseña "TempPass123!" el hash sería:
-- $2b$10$ejemplo...

-- PASO 2: Actualizar el usuario con el nuevo hash
-- Reemplaza '48380883S' con el DNI del usuario
-- Reemplaza 'HASH_AQUI' con el hash bcrypt generado

UPDATE users 
SET 
  password = '$2b$10$HASH_BCRYPT_AQUI',
  requires_password_change = true,
  verified = true
WHERE dni = '48380883S';

-- PASO 3: Verificar que se actualizó
SELECT dni, nombre, email, verified, requires_password_change,
       SUBSTRING(password, 1, 20) as password_preview
FROM users 
WHERE dni = '48380883S';

-- INSTRUCCIONES:
-- 1. Ve a https://bcrypt-generator.com/
-- 2. Ingresa una contraseña temporal simple como: Temporal2024!
-- 3. Selecciona "10" rounds
-- 4. Genera el hash
-- 5. Copia el hash y reemplaza $2b$10$HASH_BCRYPT_AQUI arriba
-- 6. Ejecuta el UPDATE
-- 7. Intenta hacer login con la contraseña que usaste (Temporal2024!)
