-- 1. Tabla despachos
CREATE TABLE IF NOT EXISTS public.despachos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text,
  telefono text,
  ciudad text,
  notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.despachos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lawyers read despachos" ON public.despachos;
CREATE POLICY "Lawyers read despachos" ON public.despachos
  FOR SELECT TO authenticated USING (public.is_lawyer(auth.uid()));

DROP POLICY IF EXISTS "Admins manage despachos" ON public.despachos;
CREATE POLICY "Admins manage despachos" ON public.despachos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_despachos_updated_at ON public.despachos;
CREATE TRIGGER trg_despachos_updated_at
  BEFORE UPDATE ON public.despachos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Tabla abogados
CREATE TABLE IF NOT EXISTS public.abogados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  despacho_id uuid REFERENCES public.despachos(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  email text NOT NULL,
  telefono text,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abogados_user_id ON public.abogados(user_id);
CREATE INDEX IF NOT EXISTS idx_abogados_despacho ON public.abogados(despacho_id);

ALTER TABLE public.abogados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lawyers read abogados" ON public.abogados;
CREATE POLICY "Lawyers read abogados" ON public.abogados
  FOR SELECT TO authenticated USING (public.is_lawyer(auth.uid()));

DROP POLICY IF EXISTS "Admins manage abogados" ON public.abogados;
CREATE POLICY "Admins manage abogados" ON public.abogados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_abogados_updated_at ON public.abogados;
CREATE TRIGGER trg_abogados_updated_at
  BEFORE UPDATE ON public.abogados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Tabla provincia_abogado (mapping)
CREATE TABLE IF NOT EXISTS public.provincia_abogado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provincia text NOT NULL UNIQUE,
  abogado_id uuid NOT NULL REFERENCES public.abogados(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provincia_abogado_provincia ON public.provincia_abogado(LOWER(provincia));

ALTER TABLE public.provincia_abogado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lawyers read provincia_abogado" ON public.provincia_abogado;
CREATE POLICY "Lawyers read provincia_abogado" ON public.provincia_abogado
  FOR SELECT TO authenticated USING (public.is_lawyer(auth.uid()));

DROP POLICY IF EXISTS "Admins manage provincia_abogado" ON public.provincia_abogado;
CREATE POLICY "Admins manage provincia_abogado" ON public.provincia_abogado
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_provincia_abogado_updated_at ON public.provincia_abogado;
CREATE TRIGGER trg_provincia_abogado_updated_at
  BEFORE UPDATE ON public.provincia_abogado
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Función helper: ¿pertenece este lead al abogado que está consultando?
CREATE OR REPLACE FUNCTION public.is_assigned_lawyer(_lead_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads_interinos l
    JOIN public.abogados a ON a.id = l.asignado_a
    WHERE l.id = _lead_id AND a.user_id = _user_id
  );
$$;

-- 5. Trigger asignación automática por provincia al crear un lead
CREATE OR REPLACE FUNCTION public.asignar_abogado_por_provincia()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_abogado_id uuid;
BEGIN
  IF NEW.asignado_a IS NULL AND NEW.provincia IS NOT NULL THEN
    SELECT pa.abogado_id INTO v_abogado_id
    FROM public.provincia_abogado pa
    JOIN public.abogados a ON a.id = pa.abogado_id
    WHERE LOWER(TRIM(pa.provincia)) = LOWER(TRIM(NEW.provincia))
      AND a.activo = true
    LIMIT 1;

    IF v_abogado_id IS NOT NULL THEN
      NEW.asignado_a = v_abogado_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_abogado_por_provincia ON public.leads_interinos;
CREATE TRIGGER trg_asignar_abogado_por_provincia
  BEFORE INSERT ON public.leads_interinos
  FOR EACH ROW EXECUTE FUNCTION public.asignar_abogado_por_provincia();

-- 6. Reescribir RLS de leads_interinos: abogado solo ve los suyos
DROP POLICY IF EXISTS "Lawyers can view all leads" ON public.leads_interinos;
DROP POLICY IF EXISTS "Lawyers can update leads" ON public.leads_interinos;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads_interinos;
DROP POLICY IF EXISTS "Lawyers view assigned or admin" ON public.leads_interinos;
DROP POLICY IF EXISTS "Lawyers update assigned or admin" ON public.leads_interinos;
DROP POLICY IF EXISTS "Admins delete leads" ON public.leads_interinos;

CREATE POLICY "Lawyers view assigned or admin"
  ON public.leads_interinos FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.abogados a
      WHERE a.id = leads_interinos.asignado_a AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Lawyers update assigned or admin"
  ON public.leads_interinos FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.abogados a
      WHERE a.id = leads_interinos.asignado_a AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.abogados a
      WHERE a.id = leads_interinos.asignado_a AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins delete leads"
  ON public.leads_interinos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. Igual para lead_historial y lead_documentos: abogado solo ve los de sus leads
DROP POLICY IF EXISTS "Lawyers can view history" ON public.lead_historial;
DROP POLICY IF EXISTS "Lawyers can insert history" ON public.lead_historial;
CREATE POLICY "Lawyers can view history"
  ON public.lead_historial FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_assigned_lawyer(lead_historial.lead_id, auth.uid())
  );
CREATE POLICY "Lawyers can insert history"
  ON public.lead_historial FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_assigned_lawyer(lead_historial.lead_id, auth.uid())
  );

DROP POLICY IF EXISTS "Lawyers can view documents" ON public.lead_documentos;
DROP POLICY IF EXISTS "Lawyers can insert documents" ON public.lead_documentos;
DROP POLICY IF EXISTS "Lawyers can update documents" ON public.lead_documentos;
CREATE POLICY "Lawyers can view documents"
  ON public.lead_documentos FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_assigned_lawyer(lead_documentos.lead_id, auth.uid())
  );
CREATE POLICY "Lawyers can insert documents"
  ON public.lead_documentos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_assigned_lawyer(lead_documentos.lead_id, auth.uid())
  );
CREATE POLICY "Lawyers can update documents"
  ON public.lead_documentos FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_assigned_lawyer(lead_documentos.lead_id, auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_assigned_lawyer(lead_documentos.lead_id, auth.uid())
  );