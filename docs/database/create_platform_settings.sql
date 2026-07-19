-- Crear tabla platform_settings para almacenar configuración de la plataforma por cuenta
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    platform_title VARCHAR(255) NOT NULL DEFAULT 'Alquiler de Canchas',
    platform_logo TEXT, -- Para almacenar la imagen en base64
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Una configuración por cuenta
    UNIQUE(account_id)
);

-- Crear índice para mejorar performance
CREATE INDEX idx_platform_settings_account_id ON platform_settings(account_id);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentar la tabla
COMMENT ON TABLE platform_settings IS 'Configuración global de la plataforma';
COMMENT ON COLUMN platform_settings.platform_title IS 'Título/nombre de la plataforma';
COMMENT ON COLUMN platform_settings.platform_logo IS 'Logo de la plataforma en formato base64';