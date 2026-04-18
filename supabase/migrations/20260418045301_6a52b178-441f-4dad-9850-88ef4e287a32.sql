
CREATE OR REPLACE FUNCTION public.asignar_abogado_por_provincia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.asignado_a IS NULL AND NEW.provincia IS NOT NULL THEN
    SELECT a.user_id INTO v_user_id
    FROM public.provincia_abogado pa
    JOIN public.abogados a ON a.id = pa.abogado_id
    WHERE LOWER(TRIM(pa.provincia)) = LOWER(TRIM(NEW.provincia))
      AND a.activo = true
      AND a.user_id IS NOT NULL
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      NEW.asignado_a = v_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
