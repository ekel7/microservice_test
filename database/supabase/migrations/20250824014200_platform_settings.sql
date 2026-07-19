-- Migración para actualizar platform_settings con account_id
-- Fecha: 2025-08-23

-- Paso 0: Crear tabla platform_settings si no existe
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform_title VARCHAR(255) DEFAULT 'Alquiler de Canchas',
    platform_logo TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paso 1: Agregar columna account_id (nullable temporalmente)
ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

-- Paso 2: Cambiar el tipo de ID de SERIAL a UUID si es necesario
DO $$
DECLARE
    id_type text;
    settings_count integer;
BEGIN
    SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'id';

    -- Contar registros existentes
    SELECT COUNT(*) INTO settings_count FROM platform_settings;

    IF id_type = 'integer' THEN
        -- Backup de datos existentes
        CREATE TEMP TABLE platform_settings_backup AS
        SELECT platform_title, platform_logo, created_at, updated_at
        FROM platform_settings;

        -- Eliminar datos existentes
        DELETE FROM platform_settings;

        -- Cambiar tipo de ID
        ALTER TABLE platform_settings ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE platform_settings ALTER COLUMN id TYPE UUID USING gen_random_uuid();
        ALTER TABLE platform_settings ALTER COLUMN id SET DEFAULT gen_random_uuid();

        -- Crear configuración por defecto para cada cuenta existente
        IF settings_count > 0 THEN
            INSERT INTO platform_settings (account_id, platform_title, platform_logo, created_at, updated_at)
            SELECT
                a.id as account_id,
                COALESCE(psb.platform_title, a.name, 'Alquiler de Canchas') as platform_title,
                COALESCE(psb.platform_logo, '') as platform_logo,
                COALESCE(psb.created_at, NOW()) as created_at,
                COALESCE(psb.updated_at, NOW()) as updated_at
            FROM accounts a
            CROSS JOIN (SELECT * FROM platform_settings_backup LIMIT 1) psb;
        ELSE
            -- Si no había datos previos, crear configuración por defecto
            INSERT INTO platform_settings (account_id, platform_title, platform_logo)
            SELECT
                a.id as account_id,
                COALESCE(a.name, 'Alquiler de Canchas') as platform_title,
                '' as platform_logo
            FROM accounts a;
        END IF;

        DROP TABLE platform_settings_backup;
    ELSE
        -- Si ya es UUID, solo crear registros faltantes
        INSERT INTO platform_settings (account_id, platform_title, platform_logo)
        SELECT
            a.id as account_id,
            COALESCE(a.name, 'Alquiler de Canchas') as platform_title,
            '' as platform_logo
        FROM accounts a
        WHERE NOT EXISTS (SELECT 1 FROM platform_settings ps WHERE ps.account_id = a.id);
    END IF;
END $$;

-- Paso 3: Hacer account_id NOT NULL y agregar constraint único
UPDATE platform_settings
SET account_id = (SELECT id FROM accounts LIMIT 1)
WHERE account_id IS NULL;

ALTER TABLE platform_settings
ALTER COLUMN account_id SET NOT NULL;

-- Paso 4: Agregar constraint único para account_id (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'platform_settings_account_id_key'
        AND table_name = 'platform_settings'
    ) THEN
        ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_account_id_key UNIQUE (account_id);
    END IF;
END $$;

-- Paso 5: Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_platform_settings_account_id ON platform_settings(account_id);

-- Paso 6: Actualizar título por defecto
UPDATE platform_settings
SET platform_title = 'Alquiler de Canchas'
WHERE platform_title = '' OR platform_title IS NULL;

-- Paso 7: Habilitar RLS para platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Paso 8: Crear política de RLS para aislamiento por cuenta
DROP POLICY IF EXISTS platform_settings_account_isolation_policy ON platform_settings;
CREATE POLICY platform_settings_account_isolation_policy ON platform_settings
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));
