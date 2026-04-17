-- Crear usuario admin miguel@asesor.legal con contraseña Admin123!
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  encrypted_pw text;
BEGIN
  -- Si ya existe, no hacer nada
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'miguel@asesor.legal') THEN
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'miguel@asesor.legal';
    -- Actualizar contraseña por si acaso
    UPDATE auth.users
      SET encrypted_password = crypt('Admin123!', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = new_user_id;
  ELSE
    encrypted_pw := crypt('Admin123!', gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id, 'authenticated', 'authenticated',
      'miguel@asesor.legal', encrypted_pw,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', 'miguel@asesor.legal', 'email_verified', true),
      'email', 'miguel@asesor.legal',
      now(), now(), now()
    );
  END IF;

  -- Asignar rol admin (idempotente)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin')
  ON CONFLICT DO NOTHING;
END $$;