ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'perito';

DO $$ BEGIN
  CREATE TYPE public.estado_valoracion AS ENUM ('borrador', 'enviada', 'aceptada', 'rechazada');
EXCEPTION WHEN duplicate_object THEN null; END $$;