-- Estado de revisión de documentos por el abogado
CREATE TYPE public.documento_estado AS ENUM ('pendiente', 'aceptado', 'rechazado');

ALTER TABLE public.lead_documentos
  ADD COLUMN estado public.documento_estado NOT NULL DEFAULT 'pendiente',
  ADD COLUMN motivo_rechazo text,
  ADD COLUMN revisado_por uuid,
  ADD COLUMN revisado_por_email text,
  ADD COLUMN revisado_at timestamptz,
  ADD COLUMN notificacion_rechazo_at timestamptz;

CREATE INDEX idx_lead_documentos_estado ON public.lead_documentos (lead_id, estado);
