-- Reemplazar la política permisiva por una con validaciones básicas
drop policy if exists "Anyone can submit a lead" on public.leads_interinos;

create policy "Anyone can submit a lead with valid data"
  on public.leads_interinos for insert
  to anon, authenticated
  with check (
    length(trim(nombre)) between 2 and 200
    and length(trim(email)) between 5 and 255
    and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    and length(trim(telefono)) between 6 and 30
    and length(trim(provincia)) between 2 and 100
    and anos_servicio between 0 and 60
    and pago_completado = false
    and stripe_payment_id is null
    and asignado_a is null
    and estado = 'Nuevo'
    and notas_abogado is null
  );