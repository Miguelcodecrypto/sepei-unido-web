// Script para resetear contraseña temporal de un usuario manualmente
// Útil cuando un usuario no puede cambiar su contraseña temporal

-- PASO 1: Generar un nuevo hash bcrypt para una contraseña temporal
-- Puedes usar esta herramienta online: https://bcrypt-generator.com/
-- O ejecutar en Node.js: const bcrypt = require('bcrypt'); bcrypt.hashSync('TuNuevaPassword123!', 10);

-- Ejemplo con contraseña temporal: "Sepei2024!"
-- Hash bcrypt (10 rounds): $2b$10$ejemplo...

-- PASO 2: Actualizar usuario específico por DNI
UPDATE users 
SET 
  password = '$2b$10$N9qo8uLOickgQ2ZPiEP6jOq', -- REEMPLAZAR con tu hash
  requires_password_change = true,
  password_changed_at = NULL
WHERE dni = '48380884Q'; -- REEMPLAZAR con el DNI del usuario

-- PASO 3: Verificar el cambio
SELECT 
  nombre,
  apellidos,
  dni,
  email,
  requires_password_change,
  password_changed_at
FROM users 
WHERE dni = '48380884Q'; -- REEMPLAZAR con el DNI del usuario

-- INSTRUCCIONES:
-- 1. Genera un hash bcrypt de la nueva contraseña temporal en: https://bcrypt-generator.com/
-- 2. Reemplaza el hash en el UPDATE (línea 12)
-- 3. Reemplaza el DNI del usuario (línea 15 y 24)
-- 4. Ejecuta el script
-- 5. Informa al usuario de su nueva contraseña temporal por email o teléfono
