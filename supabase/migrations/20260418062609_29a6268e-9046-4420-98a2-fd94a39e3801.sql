-- 1) Fix RLS: el trigger asignar_abogado_por_provincia asigna asignado_a antes
-- de evaluar el WITH CHECK, lo que rompía el alta pública de leads.
-- Quitamos las restricciones sobre asignado_a y notas_abogado de la política
-- de alta anónima (siguen protegidos por el trigger y por las políticas de UPDATE).
DROP POLICY IF EXISTS "Anyone can submit a lead with valid data" ON public.leads_interinos;

CREATE POLICY "Anyone can submit a lead with valid data"
ON public.leads_interinos
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(TRIM(BOTH FROM nombre)) >= 2
  AND length(TRIM(BOTH FROM nombre)) <= 200
  AND length(TRIM(BOTH FROM email)) >= 5
  AND length(TRIM(BOTH FROM email)) <= 255
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(TRIM(BOTH FROM telefono)) >= 6
  AND length(TRIM(BOTH FROM telefono)) <= 30
  AND length(TRIM(BOTH FROM provincia)) >= 2
  AND length(TRIM(BOTH FROM provincia)) <= 100
  AND anos_servicio >= 0
  AND anos_servicio <= 60
  AND pago_completado = false
  AND stripe_payment_id IS NULL
  AND estado = 'Nuevo'::estado_caso
  AND notas_abogado IS NULL
);

-- 2) Renombrar leads demo añadiendo " - Demo" al final del nombre
UPDATE public.leads_interinos
SET nombre = REPLACE(nombre, ' (Cliente Demo)', '') || ' - Demo'
WHERE email = 'cliente@interinos.demo'
  AND nombre NOT LIKE '%- Demo';

UPDATE public.leads_interinos
SET nombre = nombre || ' - Demo'
WHERE email LIKE '%@example.com'
  AND nombre NOT LIKE '%- Demo';