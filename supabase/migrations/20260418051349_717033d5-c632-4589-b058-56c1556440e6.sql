-- Asignar rol admin a la cuenta real del propietario
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'miguel@asesor.legal'
ON CONFLICT DO NOTHING;