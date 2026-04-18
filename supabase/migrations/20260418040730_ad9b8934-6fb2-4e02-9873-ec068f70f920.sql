-- Tabla para registrar historial de cambios en leads
CREATE TABLE public.lead_historial (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads_interinos(id) ON DELETE CASCADE,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_id UUID,
  usuario_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_historial_lead_id ON public.lead_historial(lead_id);
CREATE INDEX idx_lead_historial_created_at ON public.lead_historial(created_at DESC);

-- RLS
ALTER TABLE public.lead_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lawyers can view history"
ON public.lead_historial
FOR SELECT
TO authenticated
USING (public.is_lawyer(auth.uid()));

CREATE POLICY "Lawyers can insert history"
ON public.lead_historial
FOR INSERT
TO authenticated
WITH CHECK (public.is_lawyer(auth.uid()));

CREATE POLICY "Admins can delete history"
ON public.lead_historial
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));