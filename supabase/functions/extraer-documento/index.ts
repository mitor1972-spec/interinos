// supabase/functions/extraer-documento/index.ts
// Edge function: descarga un documento del bucket privado lead-documentos,
// lo envía al Lovable AI Gateway y guarda los datos extraídos en
// public.lead_documento_extracciones.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BUCKET = "lead-documentos";

// ──────────────────────────────────────────────────────────────
// Schemas (tool-calling) por categoría de documento
// ──────────────────────────────────────────────────────────────
type Categoria =
  | "contrato"
  | "nomina"
  | "vida_laboral"
  | "cese"
  | "dni"
  | "apud_acta"
  | "sentencia"
  | "justificante_pago"
  | "otro";

interface ExtractionTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

const TOOLS: Partial<Record<Categoria, ExtractionTool>> = {
  contrato: {
    name: "extraer_nombramiento_o_contrato",
    description:
      "Extrae los datos clave de un nombramiento (funcionario / estatutario) o de un contrato laboral temporal con la administración pública.",
    parameters: {
      type: "object",
      properties: {
        es_nombramiento: { type: "boolean", description: "true si es un nombramiento administrativo, false si es un contrato laboral" },
        fecha_inicio: { type: "string", description: "Fecha de inicio en formato YYYY-MM-DD" },
        fecha_fin: { type: "string", description: "Fecha de fin en YYYY-MM-DD, vacío si indefinido" },
        tipo: { type: "string", description: "Tipo de nombramiento o contrato: interinidad, sustitución, eventual, obra y servicio, etc." },
        causa_temporalidad: { type: "string", description: "Causa o motivo declarado de la temporalidad" },
        plaza_o_puesto: { type: "string", description: "Plaza, puesto o categoría profesional" },
        administracion: { type: "string", description: "Administración u organismo empleador" },
        organismo: { type: "string", description: "Servicio, departamento u organismo concreto" },
        duracion_meses: { type: "number", description: "Duración aproximada en meses si se puede calcular" },
        observaciones: { type: "string", description: "Cualquier observación relevante" },
      },
      required: ["fecha_inicio"],
      additionalProperties: false,
    },
  },
  cese: {
    name: "extraer_cese",
    description: "Extrae los datos de una resolución de cese, despido o fin de contrato.",
    parameters: {
      type: "object",
      properties: {
        fecha_cese: { type: "string", description: "Fecha del cese en YYYY-MM-DD" },
        motivo: { type: "string", description: "Motivo del cese expresado en la resolución" },
        tipo_resolucion: { type: "string", description: "Tipo: amortización, cobertura reglamentaria, despido objetivo, fin de obra, etc." },
        organo_emisor: { type: "string", description: "Órgano que emite la resolución" },
        administracion: { type: "string" },
        preaviso_dias: { type: "number" },
        observaciones: { type: "string" },
      },
      required: ["fecha_cese"],
      additionalProperties: false,
    },
  },
  nomina: {
    name: "extraer_nomina",
    description: "Extrae los datos clave de una nómina mensual.",
    parameters: {
      type: "object",
      properties: {
        periodo: { type: "string", description: "Mes y año de la nómina (ej: 2024-03)" },
        salario_bruto_mensual: { type: "number", description: "Total devengado bruto del mes" },
        salario_neto_mensual: { type: "number", description: "Total a percibir neto" },
        salario_bruto_anual_estimado: { type: "number", description: "Bruto mensual × 14 si hay pagas extra, ×12 si están prorrateadas" },
        categoria_profesional: { type: "string" },
        grupo_o_nivel: { type: "string" },
        administracion: { type: "string", description: "Administración empleadora" },
        organismo: { type: "string" },
        observaciones: { type: "string" },
      },
      required: ["periodo", "salario_bruto_mensual"],
      additionalProperties: false,
    },
  },
  vida_laboral: {
    name: "extraer_vida_laboral_administrativa",
    description:
      "Extrae el certificado de servicios prestados / vida laboral administrativa: períodos cronológicos en la administración.",
    parameters: {
      type: "object",
      properties: {
        es_administrativa: { type: "boolean", description: "true si es de la propia Administración, false si es del SEPE/Tesorería" },
        fecha_inicio_relacion: { type: "string", description: "Primer día trabajado en la administración (YYYY-MM-DD)" },
        periodos: {
          type: "array",
          description: "Períodos trabajados ordenados cronológicamente",
          items: {
            type: "object",
            properties: {
              fecha_inicio: { type: "string" },
              fecha_fin: { type: "string" },
              tipo: { type: "string", description: "Funcionario interino, eventual, sustitución, laboral temporal..." },
              plaza_o_puesto: { type: "string" },
              administracion: { type: "string" },
              organismo: { type: "string" },
            },
            required: ["fecha_inicio"],
            additionalProperties: false,
          },
        },
        total_dias: { type: "number" },
        total_anos: { type: "number" },
        gaps_detectados: { type: "array", items: { type: "string" }, description: "Gaps entre períodos en formato 'desde - hasta'" },
        observaciones: { type: "string" },
      },
      required: ["periodos"],
      additionalProperties: false,
    },
  },
  dni: {
    name: "extraer_dni",
    description: "Extrae los datos del Documento Nacional de Identidad.",
    parameters: {
      type: "object",
      properties: {
        nombre_completo: { type: "string" },
        nombre: { type: "string" },
        apellidos: { type: "string" },
        numero_dni: { type: "string", description: "Número de DNI con la letra (8 dígitos + letra)" },
        fecha_nacimiento: { type: "string", description: "YYYY-MM-DD" },
        fecha_caducidad: { type: "string", description: "YYYY-MM-DD" },
        lugar_nacimiento: { type: "string" },
        nacionalidad: { type: "string" },
        observaciones: { type: "string" },
      },
      required: ["numero_dni"],
      additionalProperties: false,
    },
  },
  apud_acta: {
    name: "extraer_apud_acta",
    description: "Extrae los datos de un poder de representación Apud Acta.",
    parameters: {
      type: "object",
      properties: {
        fecha_otorgamiento: { type: "string", description: "YYYY-MM-DD" },
        otorgante_nombre: { type: "string" },
        otorgante_dni: { type: "string" },
        apoderado_nombre: { type: "string" },
        apoderado_colegiado: { type: "string" },
        organo_judicial: { type: "string" },
        observaciones: { type: "string" },
      },
      required: ["fecha_otorgamiento"],
      additionalProperties: false,
    },
  },
  sentencia: {
    name: "extraer_sentencia",
    description: "Extrae los datos clave de una sentencia o resolución judicial previa.",
    parameters: {
      type: "object",
      properties: {
        fecha: { type: "string", description: "YYYY-MM-DD" },
        organo: { type: "string", description: "Juzgado o tribunal" },
        numero_sentencia: { type: "string" },
        sentido_fallo: { type: "string", description: "Estimatoria, desestimatoria, parcial..." },
        resumen: { type: "string", description: "Resumen breve de los hechos y el fallo" },
        observaciones: { type: "string" },
      },
      required: [],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `Eres un asistente jurídico especializado en derecho laboral y administrativo español, concretamente en casos de abuso de temporalidad de empleados públicos (funcionarios interinos, personal estatutario y laboral temporal).

Tu tarea es leer el documento que te enviamos (texto y/o imagen) y extraer los datos solicitados con la máxima precisión.

Reglas:
- Devuelve fechas SIEMPRE en formato YYYY-MM-DD.
- Importes en EUR, números sin separadores de miles, usa punto decimal.
- Si un campo no aparece en el documento, omítelo (no inventes).
- Si una fecha es solo "mes/año", usa el día 01.
- En vida laboral administrativa, si el documento es del SEPE/Tesorería General de la Seguridad Social y NO de la Administración empleadora, márcalo con es_administrativa=false.
- Si dudas entre dos valores, elige el más explícito y añade nota en "observaciones".`;

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function inferMime(path: string, fallback: string | null): string {
  if (fallback) return fallback;
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "doc" || ext === "docx") return "application/msword";
  return "application/octet-stream";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

interface ExtractRequest {
  documento_id: string;
  /** Permite forzar reintento aunque ya exista una extracción. */
  force?: boolean;
}

// ──────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "LOVABLE_API_KEY no configurada" }, 500);
    }
    const body = (await req.json()) as ExtractRequest;
    if (!body?.documento_id) {
      return jsonResponse({ error: "documento_id requerido" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1) Carga el documento
    const { data: doc, error: docErr } = await supabase
      .from("lead_documentos")
      .select("*")
      .eq("id", body.documento_id)
      .maybeSingle();

    if (docErr || !doc) {
      return jsonResponse({ error: "Documento no encontrado" }, 404);
    }
    const categoria = doc.categoria as Categoria;
    const tool = TOOLS[categoria];

    // 2) Crea/recupera registro de extracción en estado procesando
    const { data: existing } = await supabase
      .from("lead_documento_extracciones")
      .select("id, estado, intentos")
      .eq("documento_id", doc.id)
      .maybeSingle();

    if (existing && !body.force && (existing.estado === "completado" || existing.estado === "validado")) {
      return jsonResponse({ ok: true, skipped: true, extraccion_id: existing.id });
    }

    let extraccionId = existing?.id as string | undefined;
    if (!extraccionId) {
      const { data: ins, error: insErr } = await supabase
        .from("lead_documento_extracciones")
        .insert({
          documento_id: doc.id,
          lead_id: doc.lead_id,
          categoria,
          estado: "procesando",
          intentos: 1,
        })
        .select("id")
        .single();
      if (insErr) return jsonResponse({ error: "No se pudo crear extracción: " + insErr.message }, 500);
      extraccionId = ins.id;
    } else {
      await supabase
        .from("lead_documento_extracciones")
        .update({ estado: "procesando", intentos: (existing!.intentos ?? 0) + 1, error_mensaje: null })
        .eq("id", extraccionId);
    }

    // Si no tenemos schema para esta categoría, marcamos como completado vacío
    if (!tool) {
      await supabase
        .from("lead_documento_extracciones")
        .update({ estado: "completado", datos: {}, modelo: null })
        .eq("id", extraccionId);
      return jsonResponse({ ok: true, extraccion_id: extraccionId, datos: {} });
    }

    // 3) Descarga el archivo del bucket
    const { data: file, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(doc.storage_path);
    if (dlErr || !file) {
      await marcarError(supabase, extraccionId!, "No se pudo descargar el archivo: " + (dlErr?.message ?? "vacío"));
      return jsonResponse({ error: "Descarga fallida" }, 500);
    }

    const mime = inferMime(doc.storage_path, doc.mime_type);
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const dataUrl = `data:${mime};base64,${base64}`;

    // 4) Construir mensaje multimodal. Gemini soporta image/* y application/pdf
    //    como input_image / file inline.
    const isImageOrPdf =
      mime.startsWith("image/") || mime === "application/pdf";

    const userContent: unknown[] = [
      {
        type: "text",
        text:
          `Extrae los datos del siguiente documento de tipo "${categoria}". ` +
          `Llama OBLIGATORIAMENTE a la función "${tool.name}" con todos los campos que puedas determinar. ` +
          `Si el documento parece ser de otro tipo, indícalo en "observaciones" pero rellena igualmente lo que puedas.`,
      },
    ];
    if (isImageOrPdf) {
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    } else {
      // Para otros formatos enviamos al menos el nombre original
      userContent.push({
        type: "text",
        text: `[Archivo binario no soportado en visión: ${doc.nombre_original}. Extrae lo que puedas inferir del contexto.]`,
      });
    }

    // 5) Llamada al gateway (Gemini 2.5 Pro multimodal)
    const modelo = "google/gemini-2.5-pro";
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: tool.name } },
      }),
    });

    if (aiResp.status === 429) {
      await marcarError(supabase, extraccionId!, "Rate limit del gateway IA (429). Reintenta en unos minutos.");
      return jsonResponse({ error: "Rate limit" }, 429);
    }
    if (aiResp.status === 402) {
      await marcarError(supabase, extraccionId!, "Sin créditos en Lovable AI (402).");
      return jsonResponse({ error: "Payment required" }, 402);
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      await marcarError(supabase, extraccionId!, `IA gateway ${aiResp.status}: ${txt.slice(0, 500)}`);
      return jsonResponse({ error: "AI gateway error", status: aiResp.status }, 500);
    }

    const ai = await aiResp.json();
    const toolCall = ai?.choices?.[0]?.message?.tool_calls?.[0];
    let datos: Record<string, unknown> = {};
    if (toolCall?.function?.arguments) {
      try {
        datos = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        await marcarError(
          supabase,
          extraccionId!,
          "Respuesta IA con JSON inválido: " + String(e),
        );
        return jsonResponse({ error: "Invalid AI JSON" }, 500);
      }
    } else {
      // Fallback: contenido plano
      const content = ai?.choices?.[0]?.message?.content;
      await marcarError(
        supabase,
        extraccionId!,
        "La IA no llamó a la herramienta. Contenido: " + (typeof content === "string" ? content.slice(0, 300) : "vacío"),
      );
      return jsonResponse({ error: "No tool call" }, 500);
    }

    await supabase
      .from("lead_documento_extracciones")
      .update({
        estado: "completado",
        datos,
        modelo,
        error_mensaje: null,
      })
      .eq("id", extraccionId);

    return jsonResponse({ ok: true, extraccion_id: extraccionId, datos });
  } catch (e) {
    console.error("extraer-documento error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function marcarError(supabase: ReturnType<typeof createClient>, id: string, mensaje: string) {
  await supabase
    .from("lead_documento_extracciones")
    .update({ estado: "error", error_mensaje: mensaje })
    .eq("id", id);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
