-- Enums nuevos para perfil y resultado de viabilidad
DO $$ BEGIN
  CREATE TYPE public.perfil_tipo AS ENUM ('laboral', 'funcionario', 'desconocido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.resultado_viabilidad AS ENUM ('inviable', 'revision', 'viable', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columnas dedicadas para datos de viabilidad y trazabilidad
ALTER TABLE public.leads_interinos
  ADD COLUMN IF NOT EXISTS perfil public.perfil_tipo NOT NULL DEFAULT 'desconocido',
  ADD COLUMN IF NOT EXISTS puntuacion_viabilidad integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resultado_viabilidad public.resultado_viabilidad NOT NULL DEFAULT 'revision',
  ADD COLUMN IF NOT EXISTS revisado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisado_at timestamptz;

-- Índices útiles para filtros del panel
CREATE INDEX IF NOT EXISTS idx_leads_perfil ON public.leads_interinos(perfil);
CREATE INDEX IF NOT EXISTS idx_leads_resultado ON public.leads_interinos(resultado_viabilidad);
CREATE INDEX IF NOT EXISTS idx_leads_revisado ON public.leads_interinos(revisado) WHERE revisado = false;

-- Permitir que los anónimos también puedan rellenar puntuación/perfil/resultado al crear el lead.
-- La política existente "Anyone can submit a lead with valid data" no menciona estos campos,
-- por lo que su WITH CHECK no los restringe. No requiere cambios.
