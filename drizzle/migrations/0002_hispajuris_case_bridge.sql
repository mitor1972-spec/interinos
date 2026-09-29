ALTER TABLE public.leads_interinos
  ADD COLUMN IF NOT EXISTS portal_office_code text,
  ADD COLUMN IF NOT EXISTS portal_office_name text,
  ADD COLUMN IF NOT EXISTS portal_lawyer_name text,
  ADD COLUMN IF NOT EXISTS portal_lawyer_email text,
  ADD COLUMN IF NOT EXISTS portal_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_assigned_by text,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.lead_historial
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'vertical';

CREATE TABLE public.portal_requests (
  request_id text PRIMARY KEY,
  lead_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.portal_requests TO service_role;
ALTER TABLE public.portal_requests ENABLE ROW LEVEL SECURITY;

-- Los abogados asignados ven documentos/historial de sus casos (asignado_a = user del abogado)
CREATE OR REPLACE FUNCTION public.is_assigned_lawyer(_lead_id uuid, _user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads_interinos l
    WHERE l.id = _lead_id AND l.asignado_a IS NOT NULL AND l.asignado_a = _user_id
  );
$$;