-- Estado del proceso de extracción IA
CREATE TYPE public.extraccion_estado AS ENUM (
  'pendiente',
  'procesando',
  'completado',
  'error',
  'validado'
);

CREATE TABLE public.lead_documento_extracciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.lead_documentos(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL,
  categoria public.documento_categoria NOT NULL,
  estado public.extraccion_estado NOT NULL DEFAULT 'pendiente',
  -- Campos estructurados como JSONB (un objeto distinto según categoría).
  datos JSONB,
  modelo TEXT,
  error_mensaje TEXT,
  intentos INTEGER NOT NULL DEFAULT 0,
  validado_por UUID,
  validado_por_email TEXT,
  validado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (documento_id)
);

CREATE INDEX idx_extracciones_lead ON public.lead_documento_extracciones(lead_id);
CREATE INDEX idx_extracciones_estado ON public.lead_documento_extracciones(estado);

ALTER TABLE public.lead_documento_extracciones ENABLE ROW LEVEL SECURITY;

-- Admin: total
CREATE POLICY "Admins manage extracciones"
  ON public.lead_documento_extracciones
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Abogados asignados: ver
CREATE POLICY "Lawyers view extracciones of assigned"
  ON public.lead_documento_extracciones
  FOR SELECT TO authenticated
  USING (public.is_assigned_lawyer(lead_id, auth.uid()));

-- Abogados asignados: validar (UPDATE de estado / validado_*)
CREATE POLICY "Lawyers validate extracciones of assigned"
  ON public.lead_documento_extracciones
  FOR UPDATE TO authenticated
  USING (public.is_assigned_lawyer(lead_id, auth.uid()))
  WITH CHECK (public.is_assigned_lawyer(lead_id, auth.uid()));

-- Clientes: ver las suyas
CREATE POLICY "Clients view own extracciones"
  ON public.lead_documento_extracciones
  FOR SELECT TO authenticated
  USING (public.is_lead_owner(lead_id, auth.uid()));

-- Trigger updated_at
CREATE TRIGGER trg_extracciones_updated_at
  BEFORE UPDATE ON public.lead_documento_extracciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();