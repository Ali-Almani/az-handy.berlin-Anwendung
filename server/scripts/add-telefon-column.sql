-- Einmalig auf PostgreSQL ausführen, falls die Spalte noch fehlt:
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefon VARCHAR(40);
