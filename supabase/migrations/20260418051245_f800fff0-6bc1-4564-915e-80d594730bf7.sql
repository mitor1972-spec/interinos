-- ============================================
-- USUARIOS DEMO PARA FASE DE PRUEBAS
-- Password de todos: Demo1234!
-- ============================================

-- IDs fijos para que sean reproducibles
DO $$
DECLARE
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_abogado_id uuid := '22222222-2222-2222-2222-222222222222';
  v_abogado2_id uuid := '33333333-3333-3333-3333-333333333333';
  v_cliente_id uuid := '44444444-4444-4444-4444-444444444444';
  -- Hash bcrypt de "Demo1234!" (cost 10)
  v_hash text := crypt('Demo1234!', gen_salt('bf'));
BEGIN
  -- Crear usuarios solo si no existen
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
    email_change, email_change_token_new, recovery_token
  )
  VALUES
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@interinos.demo', v_hash, now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"nombre":"Admin Demo"}', false, '', '', '', ''),
    (v_abogado_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'abogado@interinos.demo', v_hash, now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"nombre":"Carmen López (Abogada)"}', false, '', '', '', ''),
    (v_abogado2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'abogado2@interinos.demo', v_hash, now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"nombre":"Javier Ruiz (Abogado)"}', false, '', '', '', ''),
    (v_cliente_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'cliente@interinos.demo', v_hash, now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"nombre":"María Sánchez (Cliente)"}', false, '', '', '', '')
  ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

  -- Identidades (necesario para login email/password)
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_admin_id,
     jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@interinos.demo', 'email_verified', true),
     'email', v_admin_id::text, now(), now(), now()),
    (gen_random_uuid(), v_abogado_id,
     jsonb_build_object('sub', v_abogado_id::text, 'email', 'abogado@interinos.demo', 'email_verified', true),
     'email', v_abogado_id::text, now(), now(), now()),
    (gen_random_uuid(), v_abogado2_id,
     jsonb_build_object('sub', v_abogado2_id::text, 'email', 'abogado2@interinos.demo', 'email_verified', true),
     'email', v_abogado2_id::text, now(), now(), now()),
    (gen_random_uuid(), v_cliente_id,
     jsonb_build_object('sub', v_cliente_id::text, 'email', 'cliente@interinos.demo', 'email_verified', true),
     'email', v_cliente_id::text, now(), now(), now())
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (v_admin_id, 'admin'),
    (v_abogado_id, 'lawyer'),
    (v_abogado2_id, 'lawyer'),
    (v_cliente_id, 'client')
  ON CONFLICT DO NOTHING;

  -- Vincular abogados demo a registros de la tabla abogados (los 2 primeros activos)
  UPDATE public.abogados
  SET user_id = v_abogado_id
  WHERE id = (SELECT id FROM public.abogados WHERE user_id IS NULL ORDER BY created_at LIMIT 1);

  UPDATE public.abogados
  SET user_id = v_abogado2_id
  WHERE id = (SELECT id FROM public.abogados WHERE user_id IS NULL ORDER BY created_at LIMIT 1);

  -- Asignar varios leads al abogado demo principal (para que vea casos)
  UPDATE public.leads_interinos
  SET asignado_a = v_abogado_id
  WHERE id IN (
    SELECT id FROM public.leads_interinos
    WHERE asignado_a IS NULL
    ORDER BY created_at DESC
    LIMIT 5
  );

  UPDATE public.leads_interinos
  SET asignado_a = v_abogado2_id
  WHERE id IN (
    SELECT id FROM public.leads_interinos
    WHERE asignado_a IS NULL
    ORDER BY created_at DESC
    LIMIT 3
  );

  -- Crear un lead específico vinculado al cliente demo (mismo email)
  INSERT INTO public.leads_interinos (
    nombre, email, telefono, provincia, tipo_relacion, administracion,
    anos_servicio, contratos_sucesivos, situacion_actual, documentos_disponibles,
    urgencia, semaforo, perfil, puntuacion_viabilidad, resultado_viabilidad,
    estado, pago_completado, pago_importe, pago_fecha, metodo_pago,
    asignado_a, diagnostico_titulo, diagnostico_mensaje
  ) VALUES (
    'María Sánchez (Cliente Demo)', 'cliente@interinos.demo', '600111222', 'Madrid',
    'Funcionario interino', 'Comunidad de Madrid - Sanidad',
    9, true, 'En activo en la misma plaza desde 2015',
    ARRAY['Contrato/Nombramiento', 'Vida laboral', 'Nóminas últimos 12 meses'],
    false, 'verde', 'funcionario', 11, 'viable',
    'Cliente', true, 302.5, now() - interval '3 days', 'stripe',
    v_abogado_id,
    'Caso muy viable',
    'Tu situación encaja con la doctrina TJUE. Procedemos con el análisis Fase II.'
  );
END $$;