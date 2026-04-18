-- 1. Enum de método de pago
DO $$ BEGIN
  CREATE TYPE public.metodo_pago AS ENUM ('stripe', 'transferencia', 'bizum', 'efectivo', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Enum de categoría de documento
DO $$ BEGIN
  CREATE TYPE public.documento_categoria AS ENUM (
    'contrato',
    'nomina',
    'vida_laboral',
    'cese',
    'sentencia',
    'justificante_pago',
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Campos de pago manual en leads_interinos
ALTER TABLE public.leads_interinos
  ADD COLUMN IF NOT EXISTS metodo_pago public.metodo_pago,
  ADD COLUMN IF NOT EXISTS pago_fecha timestamptz,
  ADD COLUMN IF NOT EXISTS pago_importe numeric(10,2),
  ADD COLUMN IF NOT EXISTS pago_referencia text;

-- 4. Tabla lead_documentos
CREATE TABLE IF NOT EXISTS public.lead_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads_interinos(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  nombre_original text NOT NULL,
  mime_type text,
  tamano_bytes bigint,
  categoria public.documento_categoria NOT NULL DEFAULT 'otro',
  notas text,
  subido_por uuid,
  subido_por_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_documentos_lead_id ON public.lead_documentos(lead_id);

ALTER TABLE public.lead_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lawyers can view documents" ON public.lead_documentos;
CREATE POLICY "Lawyers can view documents"
  ON public.lead_documentos FOR SELECT
  TO authenticated
  USING (public.is_lawyer(auth.uid()));

DROP POLICY IF EXISTS "Lawyers can insert documents" ON public.lead_documentos;
CREATE POLICY "Lawyers can insert documents"
  ON public.lead_documentos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_lawyer(auth.uid()));

DROP POLICY IF EXISTS "Lawyers can update documents" ON public.lead_documentos;
CREATE POLICY "Lawyers can update documents"
  ON public.lead_documentos FOR UPDATE
  TO authenticated
  USING (public.is_lawyer(auth.uid()))
  WITH CHECK (public.is_lawyer(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete documents" ON public.lead_documentos;
CREATE POLICY "Admins can delete documents"
  ON public.lead_documentos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_lead_documentos_updated_at ON public.lead_documentos;
CREATE TRIGGER trg_lead_documentos_updated_at
  BEFORE UPDATE ON public.lead_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Storage bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-documentos', 'lead-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas storage (solo abogados/admin)
DROP POLICY IF EXISTS "Lawyers read lead documents" ON storage.objects;
CREATE POLICY "Lawyers read lead documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lead-documentos' AND public.is_lawyer(auth.uid()));

DROP POLICY IF EXISTS "Lawyers upload lead documents" ON storage.objects;
CREATE POLICY "Lawyers upload lead documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lead-documentos' AND public.is_lawyer(auth.uid()));

DROP POLICY IF EXISTS "Lawyers update lead documents" ON storage.objects;
CREATE POLICY "Lawyers update lead documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'lead-documentos' AND public.is_lawyer(auth.uid()))
  WITH CHECK (bucket_id = 'lead-documentos' AND public.is_lawyer(auth.uid()));

DROP POLICY IF EXISTS "Admins delete lead documents" ON storage.objects;
CREATE POLICY "Admins delete lead documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lead-documentos' AND public.has_role(auth.uid(), 'admin'::app_role));