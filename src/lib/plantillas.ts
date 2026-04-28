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

/** Variables canónicas disponibles para plantillas. Se interpolan como {{clave}}.
 *  Se admiten dos formatos equivalentes: con punto (cliente.nombre) y con
 *  guion bajo (cliente_nombre). El motor del backend resuelve ambos. */
export const VARIABLES_CANONICAS: { key: string; descripcion: string; grupo: string }[] = [
  // Cliente
  { grupo: "Cliente", key: "cliente_nombre", descripcion: "Nombre completo del cliente" },
  { grupo: "Cliente", key: "cliente_dni", descripcion: "DNI del cliente (extraído del documento)" },
  { grupo: "Cliente", key: "cliente_email", descripcion: "Email del cliente" },
  { grupo: "Cliente", key: "cliente_telefono", descripcion: "Teléfono del cliente" },
  { grupo: "Cliente", key: "cliente_provincia", descripcion: "Provincia" },
  { grupo: "Cliente", key: "cliente_fecha_nacimiento", descripcion: "Fecha de nacimiento" },
  // Caso
  { grupo: "Caso", key: "administracion", descripcion: "Administración demandada" },
  { grupo: "Caso", key: "tipo_relacion", descripcion: "Funcionario / Laboral / Estatutario" },
  { grupo: "Caso", key: "area_sector", descripcion: "Área o sector (sanidad, educación…)" },
  { grupo: "Caso", key: "fecha_inicio_relacion", descripcion: "Fecha del primer nombramiento" },
  { grupo: "Caso", key: "fecha_cese", descripcion: "Fecha del último nombramiento / cese" },
  { grupo: "Caso", key: "anos_servicio_total", descripcion: "Años totales de servicio" },
  { grupo: "Caso", key: "nombramientos_lista", descripcion: "Lista de nombramientos detectados" },
  { grupo: "Caso", key: "documentos_aportados", descripcion: "Lista de documentos aportados" },
  // Económico
  { grupo: "Económico", key: "salario_bruto_anual", descripcion: "Salario bruto anual estimado" },
  { grupo: "Económico", key: "salario_bruto_mensual", descripcion: "Último salario bruto mensual" },
  { grupo: "Económico", key: "salario_diario", descripcion: "Salario diario calculado" },
  { grupo: "Económico", key: "indem_sistema_actual", descripcion: "Indemnización sistema actual (20 días/año)" },
  { grupo: "Económico", key: "indem_tjue_sin_tope", descripcion: "Indemnización TJUE sin tope" },
  { grupo: "Económico", key: "diferencia_perjuicio", descripcion: "Diferencia (perjuicio estimado)" },
  // Otros
  { grupo: "Otros", key: "abogado_nombre", descripcion: "Nombre del abogado asignado" },
  { grupo: "Otros", key: "abogado_email", descripcion: "Email del abogado asignado" },
  { grupo: "Otros", key: "fecha_hoy", descripcion: "Fecha de hoy (DD/MM/YYYY)" },
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

// ───────────── Plantilla base por defecto ─────────────

export const PLANTILLA_BASE_NOMBRE = "Reclamación administrativa — Interinos (base)";

export const PLANTILLA_BASE_HTML = `<h1 style="text-align:center">RECLAMACIÓN ADMINISTRATIVA POR ABUSO DE TEMPORALIDAD</h1>
<p style="text-align:right">{{fecha_hoy}}</p>

<p><strong>A LA ADMINISTRACIÓN {{administracion}}</strong></p>

<p>D./Dña. <strong>{{cliente_nombre}}</strong>, con DNI <strong>{{cliente_dni}}</strong>, con domicilio a efectos de notificaciones en la provincia de {{cliente_provincia}}, email {{cliente_email}}, teléfono {{cliente_telefono}},</p>

<p><strong>EXPONE:</strong></p>

<p><strong>Primero.</strong> Que el/la recurrente ha prestado servicios para {{administracion}} como {{tipo_relacion}} durante {{anos_servicio_total}} años, cubriendo necesidades de carácter permanente y estructural de forma ininterrumpida.</p>

<p><strong>Segundo.</strong> Que dicha situación constituye un abuso de temporalidad expresamente declarado contrario al Derecho de la Unión Europea por la Sentencia del Tribunal de Justicia de la Unión Europea de 14 de abril de 2026, Asunto C-418/24 (caso Obadal).</p>

<p><strong>Tercero.</strong> Que el perjuicio económico sufrido asciende a una diferencia entre la indemnización reconocida por el sistema español ({{indem_sistema_actual}}) y la que correspondería sin los topes declarados insuficientes por el TJUE ({{indem_tjue_sin_tope}}), lo que supone un perjuicio de <strong>{{diferencia_perjuicio}}</strong>.</p>

<p><strong>SOLICITA:</strong></p>

<p>Que se reconozca la existencia de abuso de temporalidad y se adopten las medidas reparadoras oportunas conforme a la jurisprudencia europea citada.</p>

<p>{{cliente_provincia}}, a {{fecha_hoy}}.</p>

<p>Firmado: <strong>{{cliente_nombre}}</strong><br/>
DNI: {{cliente_dni}}<br/>
Dirigido por: {{abogado_nombre}}</p>`;

/** Crea la plantilla base si todavía no existe ninguna plantilla. */
export async function asegurarPlantillaBase(): Promise<void> {
  const { count, error } = await supabase
    .from("plantillas_reclamacion")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("asegurarPlantillaBase count:", error);
    return;
  }
  if ((count ?? 0) > 0) return;
  const { data: userData } = await supabase.auth.getUser();
  const { error: insErr } = await supabase.from("plantillas_reclamacion").insert({
    nombre: PLANTILLA_BASE_NOMBRE,
    descripcion: "Plantilla inicial de reclamación administrativa para interinos.",
    tipo: "reclamacion_previa",
    contenido_html: PLANTILLA_BASE_HTML,
    variables_disponibles: VARIABLES_CANONICAS.map((v) => v.key),
    activa: true,
    creado_por: userData.user?.id ?? null,
    creado_por_email: userData.user?.email ?? null,
  });
  if (insErr) console.error("asegurarPlantillaBase insert:", insErr);
}

// ───────────── Vista previa con datos demo (cliente) ─────────────

const DEMO_CTX: Record<string, string> = {
  cliente_nombre: "María García Demo",
  cliente_dni: "12345678Z",
  cliente_email: "maria.demo@example.com",
  cliente_telefono: "600 123 456",
  cliente_provincia: "Madrid",
  cliente_fecha_nacimiento: "12/03/1980",
  administracion: "Comunidad de Madrid — Consejería de Sanidad",
  tipo_relacion: "Funcionaria interina",
  area_sector: "Sanidad",
  fecha_inicio_relacion: "01/09/2010",
  fecha_cese: "31/12/2025",
  anos_servicio_total: "15",
  nombramientos_lista: "12 nombramientos consecutivos (2010–2025)",
  documentos_aportados: "DNI, contratos, nóminas, vida laboral",
  salario_bruto_anual: "32.400,00 €",
  salario_bruto_mensual: "2.700,00 €",
  salario_diario: "90,00 €",
  indem_sistema_actual: "9.000,00 €",
  indem_tjue_sin_tope: "27.000,00 €",
  diferencia_perjuicio: "18.000,00 €",
  abogado_nombre: "Despacho Hispajuris",
  abogado_email: "info@hispajuris.es",
  fecha_hoy: new Date().toLocaleDateString("es-ES"),
};

/** Sustituye {{variable}} y {{variable|default}} en el HTML para vista previa. */
export function interpolarPlantilla(html: string, ctx: Record<string, string> = DEMO_CTX): string {
  return html.replace(/\{\{\s*([\w.]+)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (_m, key, def) => {
    const k = String(key);
    // Aceptar tanto "cliente.nombre" como "cliente_nombre"
    const v = ctx[k] ?? ctx[k.replace(/\./g, "_")] ?? ctx[k.replace(/_/g, ".")];
    if (v === undefined || v === null || v === "") return (def ?? "").trim();
    return v;
  });
}

export const DEMO_CONTEXTO = DEMO_CTX;
