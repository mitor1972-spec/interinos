-- 1) Añadir 'client' al enum app_role si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'client'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'client';
  END IF;
END$$;

-- 2) Función security definer: ¿es este usuario el cliente (por email) del lead?
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
    JOIN auth.users u ON LOWER(TRIM(u.email)) = LOWER(TRIM(l.email))
    WHERE l.id = _lead_id
      AND u.id = _user_id
  );
$$;

-- 3) Política SELECT: el cliente ve su propio lead
DROP POLICY IF EXISTS "Clients view own lead" ON public.leads_interinos;
CREATE POLICY "Clients view own lead"
ON public.leads_interinos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND LOWER(TRIM(u.email)) = LOWER(TRIM(leads_interinos.email))
  )
);

-- 4) Política SELECT documentos: el cliente ve los documentos de su lead
DROP POLICY IF EXISTS "Clients view own documents" ON public.lead_documentos;
CREATE POLICY "Clients view own documents"
ON public.lead_documentos
FOR SELECT
TO authenticated
USING (public.is_lead_owner(lead_id, auth.uid()));

-- 5) Política INSERT documentos: el cliente sube documentos a su lead
DROP POLICY IF EXISTS "Clients insert own documents" ON public.lead_documentos;
CREATE POLICY "Clients insert own documents"
ON public.lead_documentos
FOR INSERT
TO authenticated
WITH CHECK (public.is_lead_owner(lead_id, auth.uid()));

-- 6) Storage: permitir al cliente subir/leer en su carpeta {lead_id}/...
-- Se basa en is_lead_owner usando la primera carpeta del path como lead_id
DROP POLICY IF EXISTS "Clients can read own lead files" ON storage.objects;
CREATE POLICY "Clients can read own lead files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-documentos'
  AND public.is_lead_owner(
    NULLIF((storage.foldername(name))[1], '')::uuid,
    auth.uid()
  )
);

DROP POLICY IF EXISTS "Clients can upload own lead files" ON storage.objects;
CREATE POLICY "Clients can upload own lead files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-documentos'
  AND public.is_lead_owner(
    NULLIF((storage.foldername(name))[1], '')::uuid,
    auth.uid()
  )
);