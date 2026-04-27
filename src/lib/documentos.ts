import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LeadDocumento = Database["public"]["Tables"]["lead_documentos"]["Row"];
export type DocCategoria = Database["public"]["Enums"]["documento_categoria"];

export const CATEGORIAS: { value: DocCategoria; label: string }[] = [
  { value: "contrato", label: "Contrato / Nombramiento" },
  { value: "nomina", label: "Nóminas" },
  { value: "vida_laboral", label: "Vida laboral administrativa" },
  { value: "cese", label: "Resolución de cese / Despido" },
  { value: "dni", label: "DNI (ambas caras)" },
  { value: "apud_acta", label: "Apud Acta" },
  { value: "sentencia", label: "Sentencia previa" },
  { value: "justificante_pago", label: "Justificante de pago" },
  { value: "otro", label: "Otro" },
];

export const BUCKET = "lead-documentos";

export const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export function formatTamano(bytes: number | null): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function categoriaLabel(c: DocCategoria): string {
  return CATEGORIAS.find((x) => x.value === c)?.label ?? c;
}

export async function listarDocumentos(leadId: string): Promise<LeadDocumento[]> {
  const { data, error } = await supabase
    .from("lead_documentos")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error listando documentos:", error);
    return [];
  }
  return (data ?? []) as LeadDocumento[];
}

export async function subirDocumento(params: {
  leadId: string;
  file: File;
  categoria: DocCategoria;
  notas?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { leadId, file, categoria, notas } = params;
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `El archivo supera 15 MB` };
  }
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${leadId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: userData } = await supabase.auth.getUser();
  const { error: dbErr } = await supabase.from("lead_documentos").insert({
    lead_id: leadId,
    storage_path: path,
    nombre_original: file.name,
    mime_type: file.type || null,
    tamano_bytes: file.size,
    categoria,
    notas: notas?.trim() || null,
    subido_por: userData.user?.id ?? null,
    subido_por_email: userData.user?.email ?? null,
  });
  if (dbErr) {
    // limpia el archivo huérfano
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: dbErr.message };
  }
  return { ok: true };
}

export async function eliminarDocumento(doc: LeadDocumento): Promise<{ ok: boolean; error?: string }> {
  const { error: rmErr } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  if (rmErr) return { ok: false, error: rmErr.message };
  const { error: dbErr } = await supabase.from("lead_documentos").delete().eq("id", doc.id);
  if (dbErr) return { ok: false, error: dbErr.message };
  return { ok: true };
}

export async function urlFirmada(path: string, expiresIn = 60): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.error("URL firmada:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}
