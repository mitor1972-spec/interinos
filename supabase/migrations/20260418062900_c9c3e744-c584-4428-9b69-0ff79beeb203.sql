DROP POLICY IF EXISTS "Anyone can submit a lead with valid data" ON public.leads_interinos;

CREATE POLICY "Anyone can submit a lead with valid data"
ON public.leads_interinos
FOR INSERT
TO public
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
  AND notas_abogado IS NULL
);