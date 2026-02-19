-- Script para añadir la columna reply_to_id a la tabla messages existente
-- Ejecutar este script en la base de datos si ya existe la tabla messages

-- Añadir columna reply_to_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;
    RAISE NOTICE 'Columna reply_to_id añadida exitosamente';
  ELSE
    RAISE NOTICE 'La columna reply_to_id ya existe';
  END IF;
END $$;

-- Crear índice para mejorar el rendimiento de las consultas de respuestas
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
