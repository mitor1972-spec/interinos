UPDATE public.leads_interinos
SET semaforo = 'ambar',
    resultado_viabilidad = CASE WHEN resultado_viabilidad = 'urgente' THEN 'viable' ELSE resultado_viabilidad END
WHERE urgencia = false
  AND (semaforo = 'rojo' OR resultado_viabilidad = 'urgente');