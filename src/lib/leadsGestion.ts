import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/leads";
import { registrarCambios } from "@/lib/historial";

/**
 * Aplica un patch parcial a un lead, devuelve el lead actualizado y registra
 * automáticamente el cambio en el historial (uno por campo).
 */
export async function patchLead(
  leadId: string,
  patch: Partial<Lead>,
  prev: Partial<Lead>,
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads_interinos")
    .update(patch)
    .eq("id", leadId)
    .select()
    .single();
  if (error) throw error;

  // Construir cambios para historial (solo campos modificados de verdad).
  const cambios = Object.keys(patch).flatMap((campo) => {
    const before = (prev as Record<string, unknown>)[campo];
    const after = (data as unknown as Record<string, unknown>)[campo];
    if (normalize(before) === normalize(after)) return [];
    return [
      {
        campo,
        valor_anterior: normalize(before),
        valor_nuevo: normalize(after),
      },
    ];
  });
  if (cambios.length > 0) {
    void registrarCambios(leadId, cambios);
  }
  return data as Lead;
}

function normalize(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}
