-- =========================================
-- PLANTILLAS DE RECLAMACIÓN
-- =========================================
CREATE TYPE public.plantilla_tipo AS ENUM (
  'demanda',
  'recurso_alzada',
  'recurso_reposicion',
  'papeleta_conciliacion',
  'reclamacion_previa',
  'escrito_generico',
  'otro'
);

CREATE TABLE public.plantillas_reclamacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo public.plantilla_tipo NOT NULL DEFAULT 'escrito_generico',
  contenido_html TEXT NOT NULL DEFAULT '',
  variables_disponibles JSONB NOT NULL DEFAULT '[]'::jsonb,
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID,
  creado_por_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plantillas_reclamacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lawyers read active plantillas"
  ON public.plantillas_reclamacion
  FOR SELECT TO authenticated
  USING (public.is_lawyer(auth.uid()) AND activa = true);

CREATE POLICY "Admins manage plantillas"
  ON public.plantillas_reclamacion
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_plantillas_updated
BEFORE UPDATE ON public.plantillas_reclamacion
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- DOCUMENTOS GENERADOS POR PLANTILLA
-- =========================================
CREATE TYPE public.documento_generado_formato AS ENUM ('docx', 'pdf', 'html');

CREATE TABLE public.lead_documentos_generados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  plantilla_id UUID,
  plantilla_nombre TEXT,
  nombre_archivo TEXT NOT NULL,
  formato public.documento_generado_formato NOT NULL DEFAULT 'docx',
  storage_path TEXT NOT NULL,
  tamano_bytes BIGINT,
  generado_por UUID,
  generado_por_email TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_documentos_generados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage docs generados"
  ON public.lead_documentos_generados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Lawyers view docs generados of assigned"
  ON public.lead_documentos_generados
  FOR SELECT TO authenticated
  USING (public.is_assigned_lawyer(lead_id, auth.uid()));

CREATE POLICY "Lawyers insert docs generados of assigned"
  ON public.lead_documentos_generados
  FOR INSERT TO authenticated
  WITH CHECK (public.is_assigned_lawyer(lead_id, auth.uid()));

CREATE POLICY "Clients view own docs generados"
  ON public.lead_documentos_generados
  FOR SELECT TO authenticated
  USING (public.is_lead_owner(lead_id, auth.uid()));

-- Bucket para los documentos generados
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-documentos-generados', 'lead-documentos-generados', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff read generated docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lead-documentos-generados'
    AND (public.has_role(auth.uid(), 'admin') OR public.is_lawyer(auth.uid()))
  );

CREATE POLICY "Staff write generated docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lead-documentos-generados'
    AND (public.has_role(auth.uid(), 'admin') OR public.is_lawyer(auth.uid()))
  );

CREATE POLICY "Admins delete generated docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'lead-documentos-generados'
    AND public.has_role(auth.uid(), 'admin')
  );

-- =========================================
-- VALIDACIÓN IA DE COHERENCIA
-- =========================================
CREATE TABLE public.lead_validaciones_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  resumen TEXT,
  incoherencias JSONB NOT NULL DEFAULT '[]'::jsonb,
  avisos JSONB NOT NULL DEFAULT '[]'::jsonb,
  datos_analizados JSONB,
  modelo TEXT,
  generado_por UUID,
  generado_por_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_validaciones_ia_lead ON public.lead_validaciones_ia(lead_id, created_at DESC);

ALTER TABLE public.lead_validaciones_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage validaciones ia"
  ON public.lead_validaciones_ia
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Lawyers view validaciones of assigned"
  ON public.lead_validaciones_ia
  FOR SELECT TO authenticated
  USING (public.is_assigned_lawyer(lead_id, auth.uid()));

CREATE POLICY "Lawyers insert validaciones of assigned"
  ON public.lead_validaciones_ia
  FOR INSERT TO authenticated
  WITH CHECK (public.is_assigned_lawyer(lead_id, auth.uid()));