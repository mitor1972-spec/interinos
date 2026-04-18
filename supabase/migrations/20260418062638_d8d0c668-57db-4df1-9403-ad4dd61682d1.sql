-- Restaurar GRANTs base sobre leads_interinos (la RLS sigue filtrando todo)
GRANT INSERT ON public.leads_interinos TO anon, authenticated;
GRANT SELECT, UPDATE ON public.leads_interinos TO authenticated;
GRANT DELETE ON public.leads_interinos TO authenticated;

-- También aseguramos GRANTs en las tablas que usa el trigger de asignación
GRANT SELECT ON public.provincia_abogado TO anon, authenticated;
GRANT SELECT ON public.abogados TO anon, authenticated;