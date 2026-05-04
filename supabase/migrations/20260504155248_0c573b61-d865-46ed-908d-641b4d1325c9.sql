
-- 1. Campos profesionales en abogados
ALTER TABLE public.abogados
  ADD COLUMN IF NOT EXISTS num_colegiado text,
  ADD COLUMN IF NOT EXISTS colegio text,
  ADD COLUMN IF NOT EXISTS domicilio_profesional text,
  ADD COLUMN IF NOT EXISTS nif text;

-- 2. Tabla configuracion_despacho (singleton)
CREATE TABLE IF NOT EXISTS public.configuracion_despacho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL DEFAULT 'Hispajuris',
  razon_social text NOT NULL DEFAULT 'HISPAJURIS, Servicios y Gestión, S.L.',
  cif text NOT NULL DEFAULT 'B-81978066',
  domicilio text NOT NULL DEFAULT 'C/ Orense, 6. pl. 12ª, 28020 Madrid',
  email_secretariado text NOT NULL DEFAULT 'secretariado@hispajuris.es',
  banco text NOT NULL DEFAULT 'Sabadell Atlántico. C/ Velázquez, 48. 28001 Madrid',
  iban text NOT NULL DEFAULT '0081 0155 80 0001080317',
  honorarios_fase1_default numeric(10,2) NOT NULL DEFAULT 250,
  cuota_litis_default numeric(5,2) NOT NULL DEFAULT 10,
  logo_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracion_despacho ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage configuracion_despacho" ON public.configuracion_despacho;
CREATE POLICY "Admins manage configuracion_despacho"
ON public.configuracion_despacho
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Lawyers read configuracion_despacho" ON public.configuracion_despacho;
CREATE POLICY "Lawyers read configuracion_despacho"
ON public.configuracion_despacho
FOR SELECT TO authenticated
USING (public.is_lawyer(auth.uid()));

DROP TRIGGER IF EXISTS trg_configuracion_despacho_updated_at ON public.configuracion_despacho;
CREATE TRIGGER trg_configuracion_despacho_updated_at
BEFORE UPDATE ON public.configuracion_despacho
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.configuracion_despacho (nombre)
SELECT 'Hispajuris'
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_despacho);

-- 3. Añadir valor al enum plantilla_tipo
DO $$ BEGIN
  ALTER TYPE plantilla_tipo ADD VALUE IF NOT EXISTS 'hoja_encargo';
EXCEPTION WHEN others THEN NULL; END $$;

-- 4. Bucket privado assets-despacho
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets-despacho', 'assets-despacho', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins manage assets-despacho" ON storage.objects;
CREATE POLICY "Admins manage assets-despacho"
ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'assets-despacho' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'assets-despacho' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated read assets-despacho" ON storage.objects;
CREATE POLICY "Authenticated read assets-despacho"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'assets-despacho');
