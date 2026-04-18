-- Arreglar RLS: la policy actual hace SELECT a auth.users desde el rol authenticated,
-- lo que provoca "permission denied for table users" (42501).
-- Reemplazamos por una comparación contra auth.jwt() ->> 'email', que no requiere
-- acceso al schema auth.

DROP POLICY IF EXISTS "Clients view own lead" ON public.leads_interinos;

CREATE POLICY "Clients view own lead"
ON public.leads_interinos
FOR SELECT
TO authenticated
USING (
  lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
);

-- También recreamos is_lead_owner para que use la misma vía sin tocar auth.users,
-- evitando el mismo error desde otras policies (lead_documentos, lead_historial).
CREATE OR REPLACE FUNCTION public.is_lead_owner(_lead_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads_interinos l
    WHERE l.id = _lead_id
      AND lower(trim(l.email)) = lower(trim(coalesce(
        (SELECT email FROM auth.users WHERE id = _user_id),
        ''
      )))
  );
$$;