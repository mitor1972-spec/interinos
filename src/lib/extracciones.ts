import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Extraccion = Database["public"]["Tables"]["lead_documento_extracciones"]["Row"];
export type ExtraccionEstado = Database["public"]["Enums"]["extraccion_estado"];

/** Lista todas las extracciones de un lead. */
export async function listarExtracciones(leadId: string): Promise<Extraccion[]> {
  const { data, error } = await supabase
    .from("lead_documento_extracciones")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listarExtracciones:", error);
    return [];
  }
  return (data ?? []) as Extraccion[];
}

/** Obtiene la extracción asociada a un documento (si existe). */
export async function getExtraccionDeDocumento(documentoId: string): Promise<Extraccion | null> {
  const { data, error } = await supabase
    .from("lead_documento_extracciones")
    .select("*")
    .eq("documento_id", documentoId)
    .maybeSingle();
  if (error) {
    console.error("getExtraccionDeDocumento:", error);
    return null;
  }
  return (data as Extraccion) ?? null;
}

/** Lanza (o relanza con force=true) la extracción IA de un documento. */
export async function lanzarExtraccion(
  documentoId: string,
  opts: { force?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.functions.invoke("extraer-documento", {
    body: { documento_id: documentoId, force: opts.force ?? false },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Marca una extracción como validada por el abogado. */
export async function validarExtraccion(extraccionId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("lead_documento_extracciones")
    .update({
      estado: "validado",
      validado_por: userData.user?.id ?? null,
      validado_por_email: userData.user?.email ?? null,
      validado_at: new Date().toISOString(),
    })
    .eq("id", extraccionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function estadoLabel(e: ExtraccionEstado): string {
  switch (e) {
    case "pendiente":
      return "Pendiente";
    case "procesando":
      return "Analizando con IA…";
    case "completado":
      return "Datos extraídos · pendiente de validar";
    case "error":
      return "Error en la extracción";
    case "validado":
      return "Validado por abogado";
  }
}

export function estadoBadgeClass(e: ExtraccionEstado): string {
  switch (e) {
    case "pendiente":
    case "procesando":
      return "bg-muted text-muted-foreground border-border";
    case "completado":
      return "bg-primary/10 text-primary border-primary/30";
    case "validado":
      return "bg-success/10 text-success border-success/30";
    case "error":
      return "bg-destructive/10 text-destructive border-destructive/30";
  }
}
