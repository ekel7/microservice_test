-- Hacer que la columna email permita valores NULL
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;
