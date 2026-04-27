ALTER TABLE public.leads_interinos
  ADD COLUMN IF NOT EXISTS notificacion_docs_completos_at timestamptz;

COMMENT ON COLUMN public.leads_interinos.notificacion_docs_completos_at IS
  'Marca temporal del envío automático del email al abogado asignado avisándole de que el cliente ha completado todos los documentos obligatorios. Si está NULL, el email aún no se ha enviado.';