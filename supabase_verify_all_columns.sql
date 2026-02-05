-- =====================================================
-- SCRIPT DE VERIFICACIÓN Y CREACIÓN DE COLUMNAS
-- Tabla: users
-- Ejecutar en Supabase SQL Editor para asegurar que
-- todas las columnas necesarias existen
-- =====================================================

-- 1. Columnas básicas de usuario
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS nombre text,
  ADD COLUMN IF NOT EXISTS apellidos text,
  ADD COLUMN IF NOT EXISTS dni text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS parque_sepei text;

-- 2. Columnas de autenticación y contraseña
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS password text,
  ADD COLUMN IF NOT EXISTS registration_ip text,
  ADD COLUMN IF NOT EXISTS requires_password_change boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- 3. Columnas de términos y condiciones
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS terminos_aceptados boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_aceptacion_terminos timestamptz,
  ADD COLUMN IF NOT EXISTS version_terminos text DEFAULT '1.0';

-- 4. Columnas de certificado digital
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS certificado_nif text,
  ADD COLUMN IF NOT EXISTS certificado_thumbprint text,
  ADD COLUMN IF NOT EXISTS certificado_fecha_validacion timestamptz,
  ADD COLUMN IF NOT EXISTS certificado_valido boolean DEFAULT false;

-- 5. Columnas de verificación de email
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS verification_token_expires_at timestamptz;

-- 6. Columnas de votación y permisos
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS autorizado_votar boolean DEFAULT false;

-- 7. Columnas de actividad
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS last_login timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_registro timestamptz DEFAULT now();

-- 8. Columnas de notificaciones por email
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;

-- =====================================================
-- ÍNDICES para mejorar rendimiento de búsquedas
-- =====================================================

-- NOTA: Antes de crear índices únicos, verificar duplicados
-- Ejecutar primero esta consulta para ver duplicados:
/*
SELECT LOWER(email) as email, COUNT(*) as cantidad
FROM public.users 
WHERE email IS NOT NULL
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

SELECT UPPER(dni) as dni, COUNT(*) as cantidad
FROM public.users 
WHERE dni IS NOT NULL
GROUP BY UPPER(dni)
HAVING COUNT(*) > 1;
*/

-- Índice único para DNI (evitar duplicados) - solo si no hay duplicados
-- CREATE UNIQUE INDEX IF NOT EXISTS users_dni_unique_idx ON public.users (UPPER(dni)) WHERE dni IS NOT NULL;

-- Índice único para email (evitar duplicados) - solo si no hay duplicados
-- CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON public.users (LOWER(email)) WHERE email IS NOT NULL;

-- Índice para búsqueda por token de verificación (no único)
CREATE INDEX IF NOT EXISTS users_verification_token_idx ON public.users (verification_token) WHERE verification_token IS NOT NULL;

-- Índices normales (no únicos) para búsquedas
CREATE INDEX IF NOT EXISTS users_dni_idx ON public.users (UPPER(dni)) WHERE dni IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (LOWER(email)) WHERE email IS NOT NULL;

-- =====================================================
-- VERIFICAR RESULTADO
-- =====================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;
