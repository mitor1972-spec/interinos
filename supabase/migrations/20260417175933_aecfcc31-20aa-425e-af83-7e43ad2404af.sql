-- ============================================================
-- 1. ENUM y tabla de roles (patrón seguro contra recursión RLS)
-- ============================================================
create type public.app_role as enum ('lawyer', 'admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_lawyer(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('lawyer', 'admin')
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. ENUMs para leads
-- ============================================================
create type public.semaforo_tipo as enum ('rojo', 'ambar', 'verde');
create type public.estado_caso as enum ('Nuevo', 'En estudio', 'Propuesta enviada', 'Cliente', 'Descartado');

-- ============================================================
-- 3. Tabla principal de leads
-- ============================================================
create table public.leads_interinos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Datos personales
  nombre text not null,
  email text not null,
  telefono text not null,
  provincia text not null,

  -- Diagnóstico
  tipo_relacion text not null,
  administracion text not null,
  anos_servicio int not null,
  contratos_sucesivos boolean not null default false,
  situacion_actual text not null,
  documentos_disponibles text[] not null default '{}',
  urgencia boolean not null default false,
  mensaje_libre text,

  -- Resultado
  semaforo public.semaforo_tipo not null,
  diagnostico_titulo text,
  diagnostico_mensaje text,

  -- Pago (futuro)
  stripe_payment_id text,
  pago_completado boolean not null default false,

  -- Gestión interna
  estado public.estado_caso not null default 'Nuevo',
  notas_abogado text,
  asignado_a uuid references auth.users(id) on delete set null
);

create index idx_leads_created_at on public.leads_interinos(created_at desc);
create index idx_leads_semaforo on public.leads_interinos(semaforo);
create index idx_leads_estado on public.leads_interinos(estado);

alter table public.leads_interinos enable row level security;

create policy "Anyone can submit a lead"
  on public.leads_interinos for insert
  to anon, authenticated
  with check (true);

create policy "Lawyers can view all leads"
  on public.leads_interinos for select
  to authenticated
  using (public.is_lawyer(auth.uid()));

create policy "Lawyers can update leads"
  on public.leads_interinos for update
  to authenticated
  using (public.is_lawyer(auth.uid()))
  with check (public.is_lawyer(auth.uid()));

create policy "Admins can delete leads"
  on public.leads_interinos for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_leads
  before update on public.leads_interinos
  for each row
  execute function public.update_updated_at();