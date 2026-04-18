-- Seed: crear usuarios admin y abogado para Hispajuris
-- Usa pgcrypto (ya disponible en Supabase) para hashear contraseñas

DO $$
DECLARE
  v_admin_id uuid;
  v_lawyer_id uuid;
BEGIN
  -- ===== Usuario 1: secretariado@hispajuris.es (admin) =====
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'secretariado@hispajuris.es';
  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'secretariado@hispajuris.es', crypt('Admin123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Secretariado Hispajuris","name":"Secretariado Hispajuris"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'secretariado@hispajuris.es', 'email_verified', true),
      'email', v_admin_id::text, now(), now(), now());
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt('Admin123!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = raw_user_meta_data || '{"full_name":"Secretariado Hispajuris","name":"Secretariado Hispajuris"}'::jsonb,
      updated_at = now()
    WHERE id = v_admin_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- ===== Usuario 2: abogado@hispajuris.es (lawyer) =====
  SELECT id INTO v_lawyer_id FROM auth.users WHERE email = 'abogado@hispajuris.es';
  IF v_lawyer_id IS NULL THEN
    v_lawyer_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_lawyer_id, 'authenticated', 'authenticated',
      'abogado@hispajuris.es', crypt('Abogado123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Abogado Hispajuris","name":"Abogado Hispajuris"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_lawyer_id,
      jsonb_build_object('sub', v_lawyer_id::text, 'email', 'abogado@hispajuris.es', 'email_verified', true),
      'email', v_lawyer_id::text, now(), now(), now());
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt('Abogado123!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = raw_user_meta_data || '{"full_name":"Abogado Hispajuris","name":"Abogado Hispajuris"}'::jsonb,
      updated_at = now()
    WHERE id = v_lawyer_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_lawyer_id, 'lawyer')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ficha en abogados (para que aparezca el nombre en las tablas)
  INSERT INTO public.abogados (user_id, nombre, email, activo)
  VALUES (v_lawyer_id, 'Abogado Hispajuris', 'abogado@hispajuris.es', true)
  ON CONFLICT DO NOTHING;
END $$;

-- Vista de utilidad: nombre legible por user_id (para sustituir UUIDs por nombres)
CREATE OR REPLACE VIEW public.usuarios_directorio AS
SELECT
  u.id AS user_id,
  u.email,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    a.nombre,
    u.email
  ) AS nombre,
  a.id AS abogado_id,
  a.despacho_id,
  a.activo AS abogado_activo
FROM auth.users u
LEFT JOIN public.abogados a ON a.user_id = u.id;

GRANT SELECT ON public.usuarios_directorio TO authenticated;