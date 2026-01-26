-- =====================================================
-- MIGRACIÓN: Sistema de Administración de Álbumes
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Modificar tabla albums (agregar nuevas columnas)
-- -------------------------------------------------
ALTER TABLE albums ADD COLUMN
IF NOT EXISTS admin_token VARCHAR
(32) UNIQUE;
ALTER TABLE albums ADD COLUMN
IF NOT EXISTS guest_upload_enabled BOOLEAN DEFAULT true;
ALTER TABLE albums ADD COLUMN
IF NOT EXISTS max_photos_per_guest INTEGER DEFAULT 10;

-- Generar admin_token para álbumes existentes que no tienen uno
UPDATE albums
SET admin_token = encode(gen_random_bytes(16), 'hex')
WHERE admin_token IS NULL;

-- Hacer admin_token NOT NULL después de llenar los existentes
ALTER TABLE albums ALTER COLUMN admin_token
SET
NOT NULL;

-- 2. Crear tabla album_photos
-- -------------------------------------------------
CREATE TABLE
IF NOT EXISTS album_photos
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  album_id UUID NOT NULL REFERENCES albums
(id) ON
DELETE CASCADE,
  photo_url TEXT
NOT NULL,
  cloudinary_public_id TEXT,
  uploaded_by_token VARCHAR
(32),  -- NULL = admin, token = invitado
  uploaded_by_name VARCHAR
(100),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT NOW
()
);

-- Índices para mejorar rendimiento
CREATE INDEX
IF NOT EXISTS idx_album_photos_album ON album_photos
(album_id);
CREATE INDEX
IF NOT EXISTS idx_album_photos_token ON album_photos
(uploaded_by_token);
CREATE INDEX
IF NOT EXISTS idx_album_photos_order ON album_photos
(album_id, display_order);

-- 3. Crear tabla album_invites
-- -------------------------------------------------
CREATE TABLE
IF NOT EXISTS album_invites
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  album_id UUID NOT NULL REFERENCES albums
(id) ON
DELETE CASCADE,
  invite_token VARCHAR(32)
UNIQUE NOT NULL,
  guest_name VARCHAR
(100),
  photos_uploaded INTEGER DEFAULT 0,
  max_photos INTEGER DEFAULT 10,
  is_general BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT NOW
()
);

-- Índices
CREATE INDEX
IF NOT EXISTS idx_album_invites_token ON album_invites
(invite_token);
CREATE INDEX
IF NOT EXISTS idx_album_invites_album ON album_invites
(album_id);

-- 4. Migrar fotos existentes del campo photos (JSONB) a album_photos
-- -------------------------------------------------
-- Esta función migra las fotos del campo JSONB a la nueva tabla
DO $$
DECLARE
  album_record RECORD;
  current_photo_url TEXT;
  photo_index INTEGER;
BEGIN
  FOR album_record IN
  SELECT id, photos
  FROM albums
  WHERE photos IS NOT NULL
    AND jsonb_array_length(photos) > 0
  LOOP
    photo_index := 0;
FOR current_photo_url IN
SELECT jsonb_array_elements_text(album_record.photos)
    LOOP
-- Solo insertar si no existe ya
INSERT INTO album_photos
  (album_id, photo_url, display_order, uploaded_by_token)
SELECT album_record.id, current_photo_url, photo_index, NULL
WHERE NOT EXISTS (
        SELECT 1
FROM album_photos ap
WHERE ap.album_id = album_record.id AND ap.photo_url = current_photo_url
      );
photo_index := photo_index + 1;
END LOOP;
END LOOP;
END $$;

-- 5. Row Level Security (opcional pero recomendado)
-- -------------------------------------------------
-- Habilitar RLS en las nuevas tablas
ALTER TABLE album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_invites ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver fotos (para el flipbook público)
CREATE POLICY "Fotos son públicas para lectura"
ON album_photos FOR
SELECT
  USING (true);

-- Política: Solo el backend puede insertar/actualizar/eliminar (via service_role)
CREATE POLICY "Backend puede modificar fotos"
ON album_photos FOR ALL
USING
(true)
WITH CHECK
(true);

-- Política: Cualquiera puede ver invitaciones activas
CREATE POLICY "Invitaciones son públicas para lectura"
ON album_invites FOR
SELECT
  USING (true);

-- Política: Solo el backend puede modificar invitaciones
CREATE POLICY "Backend puede modificar invitaciones"
ON album_invites FOR ALL
USING
(true)
WITH CHECK
(true);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta estas consultas para verificar que todo se creó correctamente:

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'albums';

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'album_photos';

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'album_invites';

-- Ver cuántos álbumes se migraron
-- SELECT
--   (SELECT COUNT(*) FROM albums) as total_albums,
--   (SELECT COUNT(*) FROM albums WHERE admin_token IS NOT NULL) as albums_with_token,
--   (SELECT COUNT(*) FROM album_photos) as total_photos_migrated;
