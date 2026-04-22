import type { Database } from "@/integrations/supabase/types";

export type TipoReclamacion = Database["public"]["Enums"]["tipo_reclamacion"];
export type AreaSector = Database["public"]["Enums"]["area_sector"];
export type ResultadoContacto = Database["public"]["Enums"]["resultado_contacto"];
export type SiguienteAccion = Database["public"]["Enums"]["siguiente_accion"];

export interface Opcion<T extends string> {
  value: T;
  label: string;
}

export const TIPOS_RECLAMACION: Opcion<TipoReclamacion>[] = [
  { value: "abuso_temporalidad_funcionario", label: "Abuso de temporalidad — Funcionario interino" },
  { value: "abuso_temporalidad_estatutario", label: "Abuso de temporalidad — Estatutario temporal" },
  { value: "abuso_temporalidad_laboral", label: "Abuso de temporalidad — Laboral temporal" },
  { value: "indefinido_no_fijo", label: "Indefinido no fijo — Reclamación adicional" },
  { value: "cese_despido_improcedente", label: "Cese / Despido improcedente" },
  { value: "estabilizacion_sin_plaza", label: "Proceso de estabilización sin plaza" },
  { value: "responsabilidad_patrimonial", label: "Responsabilidad patrimonial administración" },
  { value: "otro", label: "Otro (campo libre)" },
];

export const AREAS_SECTOR: Opcion<AreaSector>[] = [
  { value: "sanidad_publica", label: "Sanidad pública" },
  { value: "educacion_publica", label: "Educación pública" },
  { value: "universidad_publica", label: "Universidad pública" },
  { value: "age", label: "Administración General del Estado" },
  { value: "ccaa", label: "Comunidad Autónoma" },
  { value: "ayuntamiento", label: "Ayuntamiento / Entidad Local" },
  { value: "organismo_publico", label: "Organismo público / Entidad instrumental" },
  { value: "otro", label: "Otro" },
];

export const RESULTADOS_CONTACTO: Opcion<ResultadoContacto>[] = [
  { value: "pendiente", label: "Pendiente de contactar" },
  { value: "contactado_interesado", label: "Contactado — interesado" },
  { value: "contactado_no_interesado", label: "Contactado — no interesado" },
  { value: "no_contesta", label: "No contesta" },
  { value: "cita_programada", label: "Cita programada" },
  { value: "en_negociacion", label: "En negociación" },
  { value: "cerrado_positivo", label: "Cerrado positivo" },
  { value: "cerrado_negativo", label: "Cerrado negativo" },
];

export const SIGUIENTES_ACCIONES: Opcion<SiguienteAccion>[] = [
  { value: "llamarle", label: "Llamarle" },
  { value: "enviar_propuesta", label: "Enviar propuesta de honorarios" },
  { value: "esperar_documentacion", label: "Esperar documentación" },
  { value: "enviar_al_abogado", label: "Enviar al abogado asignado" },
  { value: "derivar_perito", label: "Derivar a perito" },
  { value: "presentar_reclamacion_administrativa", label: "Presentar reclamación administrativa" },
  { value: "preparar_demanda", label: "Preparar demanda" },
  { value: "archivar", label: "Archivar" },
];

export const URGENCIAS_PERCIBIDAS: Opcion<string>[] = [
  { value: "1", label: "1 — Baja (sin plazos activos)" },
  { value: "2", label: "2 — Media-baja" },
  { value: "3", label: "3 — Media" },
  { value: "4", label: "4 — Alta (cese reciente o plazo próximo)" },
  { value: "5", label: "5 — Muy urgente (plazo inmediato o juicio)" },
];

/** Motivos específicos según el tipo de reclamación. */
export const MOTIVOS_POR_TIPO: Partial<Record<TipoReclamacion, string[]>> = {
  abuso_temporalidad_funcionario: [
    "Plaza vacante sin convocar >3 años",
    "Nombramientos sucesivos mismas funciones",
    "Cese por amortización de plaza",
    "Cese por cobertura reglamentaria",
  ],
  abuso_temporalidad_estatutario: [
    "Nombramientos eventuales encadenados",
    "Cobertura prolongada sin convocatoria",
    "Cese por incorporación de titular",
  ],
  abuso_temporalidad_laboral: [
    "Encadenamiento contratos >24 meses",
    "Contrato de interinidad prolongado",
    "Necesidad estructural cubierta con temporal",
  ],
  indefinido_no_fijo: [
    "Quiere reclamar indemnización adicional",
    "Impugnar la figura del indefinido no fijo",
  ],
  cese_despido_improcedente: [
    "Cese sin causa motivada",
    "No respetó procedimiento ni preavisos",
    "Despido tras reclamación previa (represalia)",
  ],
  estabilizacion_sin_plaza: [
    "Apto sin plaza tras concurso",
    "Quedó fuera por baremo discriminatorio",
    "Plaza ofertada no se corresponde con su puesto",
  ],
  responsabilidad_patrimonial: [
    "Daño moral por precariedad prolongada",
    "Pérdida de oportunidad de fijeza",
    "Daño económico cuantificable",
  ],
};

export function labelTipoReclamacion(v: TipoReclamacion | null): string {
  return TIPOS_RECLAMACION.find((t) => t.value === v)?.label ?? "—";
}
export function labelAreaSector(v: AreaSector | null): string {
  return AREAS_SECTOR.find((t) => t.value === v)?.label ?? "—";
}
export function labelResultadoContacto(v: ResultadoContacto | null): string {
  return RESULTADOS_CONTACTO.find((t) => t.value === v)?.label ?? "—";
}
export function labelSiguienteAccion(v: SiguienteAccion | null): string {
  return SIGUIENTES_ACCIONES.find((t) => t.value === v)?.label ?? "—";
}

/** Color del badge para resultado de contacto. */
export function resultadoContactoBadgeClass(v: ResultadoContacto): string {
  switch (v) {
    case "pendiente":
      return "bg-muted text-muted-foreground border-border";
    case "contactado_interesado":
    case "cita_programada":
    case "en_negociacion":
      return "bg-primary/10 text-primary border-primary/30";
    case "cerrado_positivo":
      return "bg-success/10 text-success border-success/30";
    case "contactado_no_interesado":
    case "no_contesta":
    case "cerrado_negativo":
      return "bg-destructive/10 text-destructive border-destructive/30";
  }
}
