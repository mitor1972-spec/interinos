-- Eliminar la vista insegura
DROP VIEW IF EXISTS public.usuarios_directorio;

-- Función segura: sólo accesible para staff (admin o lawyer)
-- Devuelve nombre legible por user_id, sin exponer auth.users públicamente
CREATE OR REPLACE FUNCTION public.obtener_directorio_usuarios()
RETURNS TABLE (
  user_id uuid,
  email text,
  nombre text,
  abogado_id uuid,
  despacho_id uuid,
  abogado_activo boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Solo staff puede consultar el directorio
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_lawyer(auth.uid())) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(
      NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
      a.nombre,
      u.email::text
    ) AS nombre,
    a.id AS abogado_id,
    a.despacho_id,
    a.activo
  FROM auth.users u
  LEFT JOIN public.abogados a ON a.user_id = u.id;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_directorio_usuarios() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_directorio_usuarios() TO authenticated;