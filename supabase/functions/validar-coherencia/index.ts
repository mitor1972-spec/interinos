// supabase/functions/validar-coherencia/index.ts
// Edge function: usa Lovable AI para revisar la coherencia entre los datos extraídos
// del caso (nombramientos, nóminas, vida laboral, DNI…) y devolver incoherencias y avisos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const MODELO = "google/gemini-2.5-flash";

const TOOL = {
  type: "function",
  function: {
    name: "registrar_validacion",
    description: "Registra el análisis de coherencia del caso",
    parameters: {
      type: "object",
      properties: {
        resumen: {
          type: "string",
          description: "Resumen breve (2-4 frases) del estado del caso y su viabilidad real",
        },
        incoherencias: {
          type: "array",
          description: "Listado de incoherencias detectadas entre los datos extraídos.",
          items: {
            type: "object",
            properties: {
              campo: { type: "string", description: "Campo o documento afectado" },
              descripcion: { type: "string", description: "Descripción clara y accionable" },
              severidad: { type: "string", enum: ["alta", "media", "baja"] },
            },
            required: ["descripcion"],
          },
        },
        avisos: {
          type: "array",
          description: "Avisos legales relevantes (límites superados, documentación faltante, etc.)",
          items: {
            type: "object",
            properties: {
              campo: { type: "string" },
              descripcion: { type: "string" },
              severidad: { type: "string", enum: ["alta", "media", "baja"] },
            },
            required: ["descripcion"],
          },
        },
      },
      required: ["resumen", "incoherencias", "avisos"],
    },
  },
};

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

    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id obligatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const [{ data: lead }, { data: extracciones }] = await Promise.all([
      admin.from("leads_interinos").select("*").eq("id", lead_id).maybeSingle(),
      admin.from("lead_documento_extracciones").select("*").eq("lead_id", lead_id),
    ]);

    if (!lead) {
      return new Response(JSON.stringify({ error: "Caso no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const datosAnalizados = {
      lead: {
        nombre: lead.nombre,
        provincia: lead.provincia,
        administracion: lead.administracion,
        tipo_relacion: lead.tipo_relacion,
        anos_servicio: lead.anos_servicio,
        situacion_actual: lead.situacion_actual,
        contratos_sucesivos: lead.contratos_sucesivos,
      },
      extracciones: (extracciones ?? []).map((e: Record<string, unknown>) => ({
        categoria: e.categoria,
        estado: e.estado,
        datos: e.datos,
      })),
    };

    const sistema = `Eres un abogado laboralista especializado en empleo público temporal en España (interinos, indefinidos no fijos, jurisprudencia TJUE C-72/22, C-59/22, etc.).
Recibes los datos declarados por el cliente y los datos extraídos por IA de sus documentos.
Tu trabajo es detectar:
1. Incoherencias entre lo declarado y los documentos (ej. años de servicio que no cuadran con las fechas, administración distinta, salarios contradictorios, gaps no justificados).
2. Avisos legales relevantes (>3 años en plaza vacante, encadenamiento >24 meses, documentación obligatoria faltante, plazos a punto de prescribir).
Responde SIEMPRE llamando a la herramienta registrar_validacion. Sé conciso, factual, en español y orientado a la acción del abogado.`;

    const usuario = `Datos del caso:\n${JSON.stringify(datosAnalizados, null, 2)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: usuario },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "registrar_validacion" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de uso de IA temporal. Reintenta en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Sin créditos de IA. Añade saldo en la configuración." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI Gateway error:", aiRes.status, text);
      return new Response(JSON.stringify({ error: `IA falló (${aiRes.status})` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    let parsed: { resumen: string; incoherencias: unknown[]; avisos: unknown[] } | null = null;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (_e) {
      parsed = null;
    }
    if (!parsed) {
      return new Response(JSON.stringify({ error: "La IA no devolvió un análisis válido" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await admin
      .from("lead_validaciones_ia")
      .insert({
        lead_id,
        resumen: parsed.resumen ?? "",
        incoherencias: parsed.incoherencias ?? [],
        avisos: parsed.avisos ?? [],
        datos_analizados: datosAnalizados,
        modelo: MODELO,
        generado_por: userData.user.id,
        generado_por_email: userData.user.email ?? null,
      })
      .select("id")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: inserted?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("validar-coherencia error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
