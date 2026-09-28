UPDATE public.leads_interinos l SET asignado_a = a.user_id
FROM public.abogados a WHERE a.id = l.asignado_a AND a.user_id IS NOT NULL;

DROP POLICY "Lawyers view assigned or admin" ON public.leads_interinos;
CREATE POLICY "Lawyers view assigned or admin" ON public.leads_interinos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR asignado_a = auth.uid());

DROP POLICY "Lawyers update assigned or admin" ON public.leads_interinos;
CREATE POLICY "Lawyers update assigned or admin" ON public.leads_interinos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR asignado_a = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR asignado_a = auth.uid());