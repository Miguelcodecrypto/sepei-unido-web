-- Crear tabla para emails externos (no usuarios)
-- Permite agregar emails que recibirán notificaciones sin ser usuarios registrados

CREATE TABLE IF NOT EXISTS external_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_external_emails_email ON external_emails(email);
CREATE INDEX IF NOT EXISTS idx_external_emails_activo ON external_emails(activo) WHERE activo = true;

-- Comentarios
COMMENT ON TABLE external_emails IS 'Emails externos que recibirán notificaciones sin ser usuarios registrados';
COMMENT ON COLUMN external_emails.email IS 'Dirección de email';
COMMENT ON COLUMN external_emails.nombre IS 'Nombre identificativo para el email';
COMMENT ON COLUMN external_emails.descripcion IS 'Descripción opcional (ej: "Presidente provincial", "Contacto externo")';
COMMENT ON COLUMN external_emails.activo IS 'Si false, no se incluirá en las notificaciones';

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_external_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER trigger_update_external_emails_updated_at
BEFORE UPDATE ON external_emails
FOR EACH ROW
EXECUTE FUNCTION update_external_emails_updated_at();

-- Verificar creación
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'external_emails'
ORDER BY ordinal_position;
