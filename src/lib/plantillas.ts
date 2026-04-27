import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Plantilla = Database["public"]["Tables"]["plantillas_reclamacion"]["Row"];
export type PlantillaTipo = Database["public"]["Enums"]["plantilla_tipo"];
export type DocumentoGenerado = Database["public"]["Tables"]["lead_documentos_generados"]["Row"];
export type DocumentoGeneradoFormato = Database["public"]["Enums"]["documento_generado_formato"];

export const PLANTILLA_TIPOS: { value: PlantillaTipo; label: string }[] = [
  { value: "demanda", label: "Demanda" },
  { value: "recurso_alzada", label: "Recurso de alzada" },
  { value: "recurso_reposicion", label: "Recurso de reposición" },
  { value: "papeleta_conciliacion", label: "Papeleta de conciliación" },
  { value: "reclamacion_previa", label: "Reclamación previa" },
  { value: "escrito_generico", label: "Escrito genérico" },
  { value: "otro", label: "Otro" },
];

/** Variables canónicas disponibles para plantillas. Se interpolan como {{clave}}. */
export const VARIABLES_CANONICAS: { key: string; descripcion: string }[] = [
  { key: "cliente.nombre", descripcion: "Nombre completo del cliente" },
  { key: "cliente.email", descripcion: "Email del cliente" },
  { key: "cliente.telefono", descripcion: "Teléfono del cliente" },
  { key: "cliente.dni", descripcion: "DNI del cliente (extraído del documento)" },
  { key: "cliente.fecha_nacimiento", descripcion: "Fecha de nacimiento" },
  { key: "cliente.provincia", descripcion: "Provincia" },
  { key: "caso.administracion", descripcion: "Administración demandada" },
  { key: "caso.tipo_relacion", descripcion: "Tipo de relación (laboral / funcionarial)" },
  { key: "caso.anos_servicio", descripcion: "Años totales de servicio" },
  { key: "caso.fecha_primer_nombramiento", descripcion: "Fecha del primer nombramiento" },
  { key: "caso.fecha_ultimo_nombramiento", descripcion: "Fecha del último nombramiento" },
  { key: "economia.salario_bruto_mensual", descripcion: "Último salario bruto mensual" },
  { key: "economia.salario_diario", descripcion: "Salario diario calculado" },
  { key: "economia.indemnizacion_actual", descripcion: "Indemnización sistema actual (20 días/año)" },
  { key: "economia.indemnizacion_tjue", descripcion: "Indemnización TJUE sin tope" },
  { key: "economia.diferencia_perjuicio", descripcion: "Diferencia (perjuicio estimado)" },
  { key: "abogado.nombre", descripcion: "Nombre del abogado asignado" },
  { key: "abogado.email", descripcion: "Email del abogado asignado" },
  { key: "fecha.hoy", descripcion: "Fecha de hoy (DD/MM/YYYY)" },
];

export async function listarPlantillas(opts: { soloActivas?: boolean } = {}): Promise<Plantilla[]> {
  let q = supabase.from("plantillas_reclamacion").select("*").order("nombre");
  if (opts.soloActivas) q = q.eq("activa", true);
  const { data, error } = await q;
  if (error) {
    console.error("listarPlantillas:", error);
    return [];
  }
  return (data ?? []) as Plantilla[];
}

export async function getPlantilla(id: string): Promise<Plantilla | null> {
  const { data, error } = await supabase
    .from("plantillas_reclamacion")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getPlantilla:", error);
    return null;
  }
  return (data as Plantilla) ?? null;
}

export async function crearPlantilla(input: {
  nombre: string;
  descripcion?: string;
  tipo: PlantillaTipo;
  contenido_html: string;
  variables_disponibles?: string[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("plantillas_reclamacion")
    .insert({
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      tipo: input.tipo,
      contenido_html: input.contenido_html,
      variables_disponibles: input.variables_disponibles ?? [],
      activa: true,
      creado_por: userData.user?.id ?? null,
      creado_por_email: userData.user?.email ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

export async function actualizarPlantilla(
  id: string,
  patch: Partial<Pick<Plantilla, "nombre" | "descripcion" | "tipo" | "contenido_html" | "variables_disponibles" | "activa">>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("plantillas_reclamacion").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function eliminarPlantilla(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("plantillas_reclamacion").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ───────────── Documentos generados ─────────────

export async function listarDocumentosGenerados(leadId: string): Promise<DocumentoGenerado[]> {
  const { data, error } = await supabase
    .from("lead_documentos_generados")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listarDocumentosGenerados:", error);
    return [];
  }
  return (data ?? []) as DocumentoGenerado[];
}

export async function generarDocumento(input: {
  lead_id: string;
  plantilla_id: string;
  formato: DocumentoGeneradoFormato;
}): Promise<{ ok: boolean; id?: string; storage_path?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("generar-documento", {
    body: input,
  });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: String(data.error) };
  return { ok: true, id: data?.id, storage_path: data?.storage_path };
}

/** Descarga un documento generado del bucket privado y devuelve URL temporal. */
export async function urlDescargaDocumentoGenerado(
  storagePath: string,
  expiresInSec = 60,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("lead-documentos-generados")
    .createSignedUrl(storagePath, expiresInSec);
  if (error) {
    console.error("urlDescargaDocumentoGenerado:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function eliminarDocumentoGenerado(
  id: string,
  storagePath: string,
): Promise<{ ok: boolean; error?: string }> {
  await supabase.storage.from("lead-documentos-generados").remove([storagePath]);
  const { error } = await supabase.from("lead_documentos_generados").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
