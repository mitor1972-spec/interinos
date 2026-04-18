-- Tabla de valoraciones
CREATE TABLE IF NOT EXISTS public.lead_valoraciones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads_interinos(id) ON DELETE CASCADE,
  perito_user_id uuid,
  perito_email text,
  estado public.estado_valoracion NOT NULL DEFAULT 'borrador',

  indemnizacion_principal numeric(12,2) NOT NULL DEFAULT 0,
  salarios_tramitacion numeric(12,2) NOT NULL DEFAULT 0,
  antiguedad_reconocida numeric(12,2) NOT NULL DEFAULT 0,
  danos_perjuicios numeric(12,2) NOT NULL DEFAULT 0,
  intereses numeric(12,2) NOT NULL DEFAULT 0,
  costas numeric(12,2) NOT NULL DEFAULT 0,
  otros_concepto text,
  otros_importe numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'EUR',

  notas text,
  fecha_valoracion timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_valoraciones_lead ON public.lead_valoraciones(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_valoraciones_perito ON public.lead_valoraciones(perito_user_id);

DROP TRIGGER IF EXISTS trg_lead_valoraciones_updated_at ON public.lead_valoraciones;
CREATE TRIGGER trg_lead_valoraciones_updated_at
  BEFORE UPDATE ON public.lead_valoraciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Función helper: ¿es perito?
CREATE OR REPLACE FUNCTION public.is_perito(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'perito'
  )
$$;

ALTER TABLE public.lead_valoraciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage valoraciones" ON public.lead_valoraciones;
CREATE POLICY "Admins manage valoraciones"
  ON public.lead_valoraciones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Perito view own valoraciones" ON public.lead_valoraciones;
CREATE POLICY "Perito view own valoraciones"
  ON public.lead_valoraciones FOR SELECT TO authenticated
  USING (public.is_perito(auth.uid()) AND perito_user_id = auth.uid());

DROP POLICY IF EXISTS "Perito insert own valoraciones" ON public.lead_valoraciones;
CREATE POLICY "Perito insert own valoraciones"
  ON public.lead_valoraciones FOR INSERT TO authenticated
  WITH CHECK (public.is_perito(auth.uid()) AND perito_user_id = auth.uid());

DROP POLICY IF EXISTS "Perito update own valoraciones" ON public.lead_valoraciones;
CREATE POLICY "Perito update own valoraciones"
  ON public.lead_valoraciones FOR UPDATE TO authenticated
  USING (public.is_perito(auth.uid()) AND perito_user_id = auth.uid())
  WITH CHECK (public.is_perito(auth.uid()) AND perito_user_id = auth.uid());

DROP POLICY IF EXISTS "Perito delete own borrador" ON public.lead_valoraciones;
CREATE POLICY "Perito delete own borrador"
  ON public.lead_valoraciones FOR DELETE TO authenticated
  USING (public.is_perito(auth.uid()) AND perito_user_id = auth.uid() AND estado = 'borrador');

DROP POLICY IF EXISTS "Lawyers view valoraciones of assigned" ON public.lead_valoraciones;
CREATE POLICY "Lawyers view valoraciones of assigned"
  ON public.lead_valoraciones FOR SELECT TO authenticated
  USING (public.is_assigned_lawyer(lead_id, auth.uid()));

DROP POLICY IF EXISTS "Clients view sent valoraciones" ON public.lead_valoraciones;
CREATE POLICY "Clients view sent valoraciones"
  ON public.lead_valoraciones FOR SELECT TO authenticated
  USING (public.is_lead_owner(lead_id, auth.uid()) AND estado IN ('enviada', 'aceptada'));

-- Directorio incluye también peritos
CREATE OR REPLACE FUNCTION public.obtener_directorio_usuarios()
RETURNS TABLE(user_id uuid, email text, nombre text, abogado_id uuid, despacho_id uuid, abogado_activo boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_lawyer(auth.uid()) OR public.is_perito(auth.uid())) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(
      NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
      a.nombre,
      u.email::text
    ) AS nombre,
    a.id AS abogado_id,
    a.despacho_id,
    a.activo
  FROM auth.users u
  LEFT JOIN public.abogados a ON a.user_id = u.id;
END;
$$;

-- Crear usuario perito@hispajuris.es
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'perito@hispajuris.es';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'perito@hispajuris.es',
      crypt('Perito123!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Perito Hispajuris"}'::jsonb,
      false, false
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'perito@hispajuris.es', 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'perito')
  ON CONFLICT DO NOTHING;
END $$;