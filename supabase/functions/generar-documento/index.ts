// supabase/functions/generar-documento/index.ts
// Edge function: rellena una plantilla con datos del lead + extracciones + valoración
// y guarda el resultado en el bucket lead-documentos-generados.
// Formatos: 'docx' (Word) y 'html' (vista imprimible que el navegador puede guardar como PDF).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// @ts-ignore — biblioteca pura JS sin tipos en esm.sh
import HTMLtoDOCX from "https://esm.sh/html-to-docx@1.8.0?bundle";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "lead-documentos-generados";

interface ReqBody {
  lead_id: string;
  plantilla_id: string;
  formato?: "docx" | "html" | "pdf";
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  return null;
}

function fmtFechaES(v: unknown): string {
  if (!v) return "";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function fmtEUR(v: number | null): string {
  if (v === null) return "";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

function safe(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

// Sustituye {{clave}} y {{clave|default}} en el contenido HTML.
function interpolar(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{\s*([\w.]+)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (_m, key, def) => {
    const val = vars[key as string];
    if (val === undefined || val === null || val === "") return (def ?? "").trim();
    return val;
  });
}

function buildContexto(args: {
  lead: Record<string, unknown>;
  extracciones: Array<Record<string, unknown>>;
  valoracion: Record<string, unknown> | null;
  abogado: { nombre: string; email: string } | null;
}): Record<string, string> {
  const { lead, extracciones, valoracion, abogado } = args;

  // Localizar datos clave en las extracciones por categoría
  const porCategoria: Record<string, Array<Record<string, unknown>>> = {};
  for (const e of extracciones) {
    const cat = String(e.categoria ?? "otro");
    porCategoria[cat] ??= [];
    porCategoria[cat].push(e);
  }

  const dni = (porCategoria["dni"] ?? [])[0]?.datos as Record<string, unknown> | undefined;
  const nominas = (porCategoria["nomina"] ?? []).map((e) => e.datos as Record<string, unknown>);
  const contratos = (porCategoria["contrato"] ?? []).map((e) => e.datos as Record<string, unknown>);

  // Salario bruto mensual (último)
  const salariosMensuales = nominas
    .map((n) => toNum(n?.salario_bruto_mensual))
    .filter((n): n is number => n !== null);
  const salarioBrutoMensual = salariosMensuales.length
    ? salariosMensuales[salariosMensuales.length - 1]
    : null;
  const salarioDiario = salarioBrutoMensual !== null ? salarioBrutoMensual / 30 : null;

  // Fechas primer / último nombramiento
  const fechasInicio = contratos
    .map((c) => safe(c?.fecha_inicio))
    .filter((s) => /^\d{4}-\d{2}-\d{2}/.test(s))
    .sort();
  const fechaPrimer = fechasInicio[0] ?? "";
  const fechaUltimo = fechasInicio[fechasInicio.length - 1] ?? "";

  // Económico desde valoración si existe
  const indActual = valoracion ? toNum(valoracion.indemnizacion_principal) : null;
  const indTjue =
    valoracion ? toNum(valoracion.danos_perjuicios) ?? toNum(valoracion.total) : null;
  const diferencia =
    indActual !== null && indTjue !== null ? Math.max(0, indTjue - indActual) : null;

  const hoy = new Date();
  const hoyES = `${String(hoy.getDate()).padStart(2, "0")}/${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`;

  return {
    "cliente.nombre": safe(lead.nombre),
    "cliente.email": safe(lead.email),
    "cliente.telefono": safe(lead.telefono),
    "cliente.dni": safe(dni?.numero ?? dni?.dni ?? ""),
    "cliente.fecha_nacimiento": fmtFechaES(dni?.fecha_nacimiento),
    "cliente.provincia": safe(lead.provincia),
    "caso.administracion": safe(lead.administracion),
    "caso.tipo_relacion": safe(lead.tipo_relacion),
    "caso.anos_servicio": safe(lead.anos_servicio),
    "caso.fecha_primer_nombramiento": fmtFechaES(fechaPrimer),
    "caso.fecha_ultimo_nombramiento": fmtFechaES(fechaUltimo),
    "economia.salario_bruto_mensual": fmtEUR(salarioBrutoMensual),
    "economia.salario_diario": fmtEUR(salarioDiario),
    "economia.indemnizacion_actual": fmtEUR(indActual),
    "economia.indemnizacion_tjue": fmtEUR(indTjue),
    "economia.diferencia_perjuicio": fmtEUR(diferencia),
    "abogado.nombre": abogado?.nombre ?? "",
    "abogado.email": abogado?.email ?? "",
    "fecha.hoy": hoyES,
  };
}

function htmlImprimible(titulo: string, contenidoHtml: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;max-width:800px;margin:40px auto;color:#111;line-height:1.55;padding:0 24px}
  h1,h2,h3{font-family:Arial,Helvetica,sans-serif}
  @media print{body{margin:0;padding:24mm 20mm}}
</style></head><body>${contenidoHtml}</body></html>`;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.lead_id || !body?.plantilla_id) {
      return new Response(JSON.stringify({ error: "lead_id y plantilla_id son obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formato = body.formato ?? "docx";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const [{ data: plantilla }, { data: lead }, { data: extracciones }, { data: valoracion }] =
      await Promise.all([
        admin.from("plantillas_reclamacion").select("*").eq("id", body.plantilla_id).maybeSingle(),
        admin.from("leads_interinos").select("*").eq("id", body.lead_id).maybeSingle(),
        admin.from("lead_documento_extracciones").select("*").eq("lead_id", body.lead_id),
        admin
          .from("lead_valoraciones")
          .select("*")
          .eq("lead_id", body.lead_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (!plantilla)
      return new Response(JSON.stringify({ error: "Plantilla no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (!lead)
      return new Response(JSON.stringify({ error: "Caso no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Abogado asignado (si lo hay)
    let abogado: { nombre: string; email: string } | null = null;
    if (lead.asignado_a) {
      const { data: ab } = await admin
        .from("abogados")
        .select("nombre, email")
        .eq("id", lead.asignado_a)
        .maybeSingle();
      if (ab) abogado = { nombre: ab.nombre ?? "", email: ab.email ?? "" };
    }

    const ctx = buildContexto({
      lead: lead as Record<string, unknown>,
      extracciones: (extracciones ?? []) as Array<Record<string, unknown>>,
      valoracion: (valoracion ?? null) as Record<string, unknown> | null,
      abogado,
    });

    const htmlRellenado = interpolar(plantilla.contenido_html ?? "", ctx);
    const fullHtml = htmlImprimible(plantilla.nombre, htmlRellenado);

    const tsName = `${slugify(plantilla.nombre)}-${Date.now()}`;
    let storagePath: string;
    let contentType: string;
    let fileBytes: Uint8Array;
    let nombreArchivo: string;
    let formatoFinal: "docx" | "html" = "docx";

    if (formato === "html" || formato === "pdf") {
      storagePath = `${body.lead_id}/${tsName}.html`;
      contentType = "text/html; charset=utf-8";
      fileBytes = new TextEncoder().encode(fullHtml);
      nombreArchivo = `${slugify(plantilla.nombre)}.html`;
      formatoFinal = "html";
    } else {
      // DOCX
      const docxBuffer: ArrayBuffer = await HTMLtoDOCX(fullHtml, null, {
        table: { row: { cantSplit: true } },
        footer: false,
        pageNumber: false,
      });
      storagePath = `${body.lead_id}/${tsName}.docx`;
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      fileBytes = new Uint8Array(docxBuffer);
      nombreArchivo = `${slugify(plantilla.nombre)}.docx`;
      formatoFinal = "docx";
    }

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, fileBytes, { contentType, upsert: false });
    if (upErr) {
      return new Response(JSON.stringify({ error: `Subida fallida: ${upErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: insertado, error: insErr } = await admin
      .from("lead_documentos_generados")
      .insert({
        lead_id: body.lead_id,
        plantilla_id: plantilla.id,
        plantilla_nombre: plantilla.nombre,
        nombre_archivo: nombreArchivo,
        formato: formatoFinal,
        storage_path: storagePath,
        tamano_bytes: fileBytes.byteLength,
        generado_por: userData.user.id,
        generado_por_email: userData.user.email ?? null,
      })
      .select("id")
      .single();
    if (insErr) {
      return new Response(JSON.stringify({ error: `Registro fallido: ${insErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, id: insertado?.id, storage_path: storagePath, formato: formatoFinal }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generar-documento error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
