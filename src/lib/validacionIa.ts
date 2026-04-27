import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ValidacionIA = Database["public"]["Tables"]["lead_validaciones_ia"]["Row"];

export interface IncoherenciaItem {
  campo?: string;
  descripcion: string;
  severidad?: "alta" | "media" | "baja";
}

export async function ultimaValidacion(leadId: string): Promise<ValidacionIA | null> {
  const { data, error } = await supabase
    .from("lead_validaciones_ia")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("ultimaValidacion:", error);
    return null;
  }
  return (data as ValidacionIA) ?? null;
}

export async function lanzarValidacion(
  leadId: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { data, error } = await supabase.functions.invoke("validar-coherencia", {
    body: { lead_id: leadId },
  });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: String(data.error) };
  return { ok: true, id: data?.id };
}

export function normalizarLista(v: unknown): IncoherenciaItem[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => {
    if (typeof item === "string") return { descripcion: item };
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      return {
        campo: typeof obj.campo === "string" ? obj.campo : undefined,
        descripcion:
          typeof obj.descripcion === "string"
            ? obj.descripcion
            : typeof obj.mensaje === "string"
              ? (obj.mensaje as string)
              : JSON.stringify(obj),
        severidad:
          obj.severidad === "alta" || obj.severidad === "media" || obj.severidad === "baja"
            ? obj.severidad
            : undefined,
      };
    }
    return { descripcion: String(item) };
  });
}
