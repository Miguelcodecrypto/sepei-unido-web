-- Script para deshabilitar RLS temporalmente en las tablas de votaciones
-- Esto permite que el sistema funcione sin autenticación de Supabase

-- Deshabilitar RLS en las tablas
ALTER TABLE votaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_votacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE votos DISABLE ROW LEVEL SECURITY;

-- Las tablas ahora son de acceso público
-- IMPORTANTE: Cuando implementes autenticación real de Supabase, 
-- vuelve a habilitar RLS y usa las políticas del script principal
