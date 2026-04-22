-- Enums for Gestión Hispajuris fields
CREATE TYPE public.tipo_reclamacion AS ENUM (
  'abuso_temporalidad_funcionario',
  'abuso_temporalidad_estatutario',
  'abuso_temporalidad_laboral',
  'indefinido_no_fijo',
  'cese_despido_improcedente',
  'estabilizacion_sin_plaza',
  'responsabilidad_patrimonial',
  'otro'
);

CREATE TYPE public.area_sector AS ENUM (
  'sanidad_publica',
  'educacion_publica',
  'universidad_publica',
  'age',
  'ccaa',
  'ayuntamiento',
  'organismo_publico',
  'otro'
);

CREATE TYPE public.resultado_contacto AS ENUM (
  'pendiente',
  'contactado_interesado',
  'contactado_no_interesado',
  'no_contesta',
  'cita_programada',
  'en_negociacion',
  'cerrado_positivo',
  'cerrado_negativo'
);

CREATE TYPE public.siguiente_accion AS ENUM (
  'llamarle',
  'enviar_propuesta',
  'esperar_documentacion',
  'enviar_al_abogado',
  'derivar_perito',
  'presentar_reclamacion_administrativa',
  'preparar_demanda',
  'archivar'
);

-- Add columns to leads_interinos
ALTER TABLE public.leads_interinos
  ADD COLUMN tipo_reclamacion public.tipo_reclamacion,
  ADD COLUMN motivo_especifico text,
  ADD COLUMN area_sector public.area_sector,
  ADD COLUMN urgencia_percibida smallint CHECK (urgencia_percibida BETWEEN 1 AND 5),
  ADD COLUMN resultado_contacto public.resultado_contacto NOT NULL DEFAULT 'pendiente',
  ADD COLUMN siguiente_accion public.siguiente_accion,
  ADD COLUMN profesional_interviniente uuid REFERENCES public.abogados(id) ON DELETE SET NULL,
  ADD COLUMN fecha_solicitud_inicial date,
  ADD COLUMN servicio_especifico text,
  ADD COLUMN accion_pendiente text,
  ADD COLUMN encargo_firmado boolean NOT NULL DEFAULT false,
  ADD COLUMN cobro_realizado boolean NOT NULL DEFAULT false,
  ADD COLUMN factura_emitida boolean NOT NULL DEFAULT false,
  ADD COLUMN apud_acta_recibido boolean NOT NULL DEFAULT false;

CREATE INDEX idx_leads_profesional_interviniente
  ON public.leads_interinos(profesional_interviniente);
CREATE INDEX idx_leads_resultado_contacto
  ON public.leads_interinos(resultado_contacto);
CREATE INDEX idx_leads_siguiente_accion
  ON public.leads_interinos(siguiente_accion);