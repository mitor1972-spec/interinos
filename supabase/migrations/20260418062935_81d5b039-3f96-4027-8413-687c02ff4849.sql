DROP POLICY IF EXISTS "Anyone can submit a lead with valid data" ON public.leads_interinos;

CREATE POLICY "Anyone can submit a lead with valid data"
ON public.leads_interinos
FOR INSERT
TO public
WITH CHECK (true);