import { supabase } from "@/integrations/supabase/client";

export type EstadoValoracion = "borrador" | "enviada" | "aceptada" | "rechazada";

export interface Valoracion {
  id: string;
  lead_id: string;
  perito_user_id: string | null;
  perito_email: string | null;
  estado: EstadoValoracion;
  indemnizacion_principal: number;
  salarios_tramitacion: number;
  antiguedad_reconocida: number;
  danos_perjuicios: number;
  intereses: number;
  costas: number;
  otros_concepto: string | null;
  otros_importe: number;
  total: number;
  moneda: string;
  notas: string | null;
  fecha_valoracion: string;
  created_at: string;
  updated_at: string;
}

export const ESTADO_VALORACION: { value: EstadoValoracion; label: string; className: string }[] = [
  { value: "borrador", label: "Borrador", className: "bg-muted text-muted-foreground border-border" },
  { value: "enviada", label: "Enviada", className: "bg-accent/15 text-accent-foreground border-accent/30" },
  { value: "aceptada", label: "Aceptada", className: "bg-success/10 text-success border-success/30" },
  { value: "rechazada", label: "Rechazada", className: "bg-destructive/10 text-destructive border-destructive/30" },
];

export function estadoValoracionConfig(s: EstadoValoracion) {
  return ESTADO_VALORACION.find((x) => x.value === s)!;
}

export function calcularTotal(v: Partial<Valoracion>): number {
  return (
    (Number(v.indemnizacion_principal) || 0) +
    (Number(v.salarios_tramitacion) || 0) +
    (Number(v.antiguedad_reconocida) || 0) +
    (Number(v.danos_perjuicios) || 0) +
    (Number(v.intereses) || 0) +
    (Number(v.costas) || 0) +
    (Number(v.otros_importe) || 0)
  );
}

export async function listarValoraciones(leadId: string): Promise<Valoracion[]> {
  const { data, error } = await supabase
    .from("lead_valoraciones" as never)
    .select("*")
    .eq("lead_id", leadId)
    .order("fecha_valoracion", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Valoracion[];
}

export async function crearValoracion(
  leadId: string,
  peritoUserId: string,
  peritoEmail: string | null,
): Promise<Valoracion> {
  const payload = {
    lead_id: leadId,
    perito_user_id: peritoUserId,
    perito_email: peritoEmail,
    estado: "borrador" as EstadoValoracion,
    total: 0,
  };
  const { data, error } = await supabase
    .from("lead_valoraciones" as never)
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Valoracion;
}

export async function guardarValoracion(
  id: string,
  patch: Partial<Valoracion>,
): Promise<Valoracion> {
  const total = calcularTotal(patch);
  const { data, error } = await supabase
    .from("lead_valoraciones" as never)
    .update({ ...patch, total } as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Valoracion;
}

export async function eliminarValoracion(id: string): Promise<void> {
  const { error } = await supabase
    .from("lead_valoraciones" as never)
    .delete()
    .eq("id", id);
  if (error) throw error;
}
