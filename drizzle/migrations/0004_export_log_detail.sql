ALTER TABLE public.export_log ADD COLUMN IF NOT EXISTS detail text;
COMMENT ON COLUMN public.export_log.detail IS 'Descripción del acceso (sin datos personales del cliente).';