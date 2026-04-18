import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/leads";

export interface CambioHistorial {
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
}

/** Etiqueta legible por campo. */
const LABELS: Record<string, string> = {
  estado: "Estado",
  urgencia: "Urgencia",
  asignado_a: "Abogado asignado",
  notas_abogado: "Notas",
  nombre: "Nombre",
  email: "Email",
  telefono: "Teléfono",
  provincia: "Provincia",
  tipo_relacion: "Tipo relación",
  administracion: "Administración",
  anos_servicio: "Años de servicio",
  situacion_actual: "Situación actual",
  perfil: "Perfil",
  semaforo: "Semáforo",
  pago_completado: "Pago confirmado",
  metodo_pago: "Método de pago",
  pago_fecha: "Fecha del pago",
  pago_importe: "Importe pagado",
  pago_referencia: "Referencia de pago",
};

export function labelCampo(campo: string): string {
  return LABELS[campo] ?? campo;
}

function normalize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

/** Detecta cambios entre dos leads y devuelve solo los relevantes. */
export function diffLeads(
  prev: Partial<Lead>,
  next: Partial<Lead>,
  campos: (keyof Lead)[],
): CambioHistorial[] {
  const cambios: CambioHistorial[] = [];
  for (const k of campos) {
    const a = normalize(prev[k]);
    const b = normalize(next[k]);
    if (a !== b) {
      cambios.push({ campo: String(k), valor_anterior: a, valor_nuevo: b });
    }
  }
  return cambios;
}

/** Registra un lote de cambios en la tabla lead_historial. */
export async function registrarCambios(
  leadId: string,
  cambios: CambioHistorial[],
): Promise<void> {
  if (cambios.length === 0) return;
  const { data: userData } = await supabase.auth.getUser();
  const usuario_id = userData.user?.id ?? null;
  const usuario_email = userData.user?.email ?? null;
  const rows = cambios.map((c) => ({
    lead_id: leadId,
    campo: c.campo,
    valor_anterior: c.valor_anterior,
    valor_nuevo: c.valor_nuevo,
    usuario_id,
    usuario_email,
  }));
  const { error } = await supabase.from("lead_historial").insert(rows);
  if (error) {
    // No bloqueamos la UI: solo log
    console.error("No se pudo registrar el historial:", error);
  }
}

export interface HistorialEntry {
  id: string;
  lead_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  usuario_id: string | null;
  usuario_email: string | null;
  created_at: string;
}

export async function fetchHistorial(leadId: string): Promise<HistorialEntry[]> {
  const { data, error } = await supabase
    .from("lead_historial")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error cargando historial:", error);
    return [];
  }
  return (data ?? []) as HistorialEntry[];
}
