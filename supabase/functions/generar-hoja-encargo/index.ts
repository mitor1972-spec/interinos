// supabase/functions/generar-hoja-encargo/index.ts
// Genera la "Hoja de Encargo Profesional" de Hispajuris en formato .docx
// rellenada con los datos del lead, el abogado y el despacho.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// @ts-ignore — librería pura JS
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  HeightRule,
} from "https://esm.sh/docx@8.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET_DOCS = "lead-documentos-generados";
const BUCKET_ASSETS = "assets-despacho";

interface ReqBody {
  lead_id: string;
  abogado_nombre: string;
  abogado_colegio: string;
  abogado_num_colegiado: string;
  abogado_domicilio_profesional: string;
  abogado_nif: string;
  cliente_nombre?: string;
  cliente_dni?: string;
  cliente_provincia?: string;
  tipo_relacion?: string;
  administracion?: string;
  anos_servicio?: number | string;
  honorarios_fase1: number;
  iva_fase1: number;
  gastos_suplidos: number;
  honorarios_fase2_exito: number;
}

const FONT = "Arial";

function fmtEUR(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n || 0);
}

function fechaHoy(): string {
  return new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function p(text: string, opts: { bold?: boolean; size?: number; align?: AlignmentType; spacing?: number } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 120 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: opts.size ?? 22, // 11pt
        font: FONT,
      }),
    ],
  });
}

function pRich(runs: Array<{ text: string; bold?: boolean }>, opts: { align?: AlignmentType; spacing?: number } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 120 },
    children: runs.map(
      (r) => new TextRun({ text: r.text, bold: r.bold, size: 22, font: FONT }),
    ),
  });
}

function cell(text: string, opts: { bold?: boolean; align?: AlignmentType; shade?: string; width: number } = { width: 4680 }) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.shade
      ? { fill: opts.shade, type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [new TextRun({ text, bold: opts.bold, size: 22, font: FONT })],
      }),
    ],
  });
}

function tabla(rows: Array<{ left: string; right: string; bold?: boolean; shade?: string }>) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "888888" };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [6000, 3360],
    rows: rows.map(
      (r) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 6000, type: WidthType.DXA },
              shading: r.shade ? { fill: r.shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              borders,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: r.left, bold: r.bold, size: 22, font: FONT })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3360, type: WidthType.DXA },
              shading: r.shade ? { fill: r.shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              borders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: r.right, bold: r.bold, size: 22, font: FONT })],
                }),
              ],
            }),
          ],
        }),
    ),
  });
}

function firmaTable(clienteNombre: string, clienteDni: string, abogadoNombre: string, abogadoNif: string) {
  const border = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const col = (lines: string[]) =>
    new TableCell({
      width: { size: 4680, type: WidthType.DXA },
      borders,
      margins: { top: 200, bottom: 80, left: 120, right: 120 },
      children: lines.map(
        (l, i) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: l, bold: i === 0, size: 22, font: FONT })],
          }),
      ),
    });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({
        height: { value: 1200, rule: HeightRule.ATLEAST },
        children: [
          col(["El cliente", "", "_____________________________", clienteNombre, `DNI nº: ${clienteDni}`]),
          col([
            "El/La Letrado/a (por cuenta de Hispajuris)",
            "",
            "_____________________________",
            abogadoNombre,
            `DNI nº: ${abogadoNif}`,
          ]),
        ],
      }),
    ],
  });
}

async function descargarLogo(supa: ReturnType<typeof createClient>): Promise<Uint8Array | null> {
  // Busca el primer archivo en assets-despacho que empiece por "logo"
  const { data: list } = await supa.storage.from(BUCKET_ASSETS).list("", { limit: 50 });
  const file = list?.find((f) => /^logo/i.test(f.name));
  if (!file) return null;
  const { data, error } = await supa.storage.from(BUCKET_ASSETS).download(file.name);
  if (error || !data) return null;
  const buf = await data.arrayBuffer();
  return new Uint8Array(buf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: ReqBody = await req.json();
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Cargar lead para completar datos por defecto
    const { data: lead, error: leadErr } = await supa
      .from("leads_interinos")
      .select("*")
      .eq("id", body.lead_id)
      .maybeSingle();
    if (leadErr || !lead) throw new Error("Lead no encontrado");

    const cliente_nombre = body.cliente_nombre || lead.nombre || "";
    const cliente_dni = body.cliente_dni || "";
    const cliente_provincia = body.cliente_provincia || lead.provincia || "";
    const tipo_relacion = body.tipo_relacion || lead.tipo_relacion || "";
    const administracion = body.administracion || lead.administracion || "";
    const anos_servicio = String(body.anos_servicio ?? lead.anos_servicio ?? "");

    const honorarios_fase1 = Number(body.honorarios_fase1) || 0;
    const iva_fase1 = Number(body.iva_fase1) || 0;
    const subtotal_fase1 = honorarios_fase1 + iva_fase1;
    const gastos_suplidos = Number(body.gastos_suplidos) || 0;
    const total_fase1 = subtotal_fase1 + gastos_suplidos;

    // 2. Logo (opcional)
    const logoBytes = await descargarLogo(supa);
    const headerChildren: Paragraph[] = [];
    if (logoBytes) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
          children: [
            new ImageRun({
              data: logoBytes,
              transformation: { width: 140, height: 50 },
            } as never),
          ],
        }),
      );
    }

    // 3. Construir documento
    const doc = new Document({
      styles: {
        default: { document: { run: { font: FONT, size: 22 } } },
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 }, // A4
              margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // 2cm
            },
          },
          children: [
            ...headerChildren,
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 360 },
              children: [
                new TextRun({ text: "HOJA DE ENCARGO PROFESIONAL", bold: true, size: 28, font: FONT }),
              ],
            }),

            // Datos del cliente
            pRich([
              { text: "D/Dña. " },
              { text: cliente_nombre, bold: true },
              { text: `, mayor de edad con domicilio en ${cliente_provincia}, con DNI nº ` },
              { text: cliente_dni, bold: true },
              { text: ", en lo sucesivo, el cliente, en nombre propio." },
            ]),

            p("EXPONE", { bold: true, spacing: 200 }),

            pRich([
              { text: "Que encarga profesionalmente al Letrado D. " },
              { text: abogadoLine(body.abogado_nombre), bold: true },
              { text: ", colegiado nº " },
              { text: body.abogado_num_colegiado, bold: true },
              { text: " del Ilustre Colegio de Abogados de " },
              { text: body.abogado_colegio, bold: true },
              { text: ", con domicilio profesional en " },
              { text: body.abogado_domicilio_profesional },
              { text: " y NIF nº " },
              { text: body.abogado_nif, bold: true },
              {
                text:
                  ", y que actúa por cuenta de HISPAJURIS, Servicios y Gestión, S.L. (en adelante, Hispajuris) domiciliada en Madrid, C/ Orense, 6. pl. 12ª, C.I.F. B-81978066, la realización de los siguientes trabajos profesionales:",
              },
            ]),

            p(
              `Reclamación por abuso de temporalidad en el empleo público al amparo de la Sentencia del Tribunal de Justicia de la Unión Europea de 14 de abril de 2026, Asunto C-418/24 (caso Obadal), en relación con la situación de ${cliente_nombre} como ${tipo_relacion} en ${administracion} durante ${anos_servicio} años.`,
              { spacing: 240 },
            ),

            p("PRESUPUESTO DE SERVICIOS", { bold: true, spacing: 160 }),
            tabla([
              { left: "Servicio", right: "Importes", bold: true, shade: "E5ECF4" },
              { left: "Honorarios profesionales Fase I", right: fmtEUR(honorarios_fase1) },
              { left: "I.V.A.: Tipo 21%", right: fmtEUR(iva_fase1) },
              { left: "Subtotal", right: fmtEUR(subtotal_fase1), bold: true },
              { left: "Gastos y suplidos", right: fmtEUR(gastos_suplidos) },
              { left: "Total presupuesto", right: fmtEUR(total_fase1), bold: true, shade: "F4F6F8" },
            ]),
            p(
              `Fase II (procedimiento judicial si necesario): 650€ + IVA + cuota de éxito del ${body.honorarios_fase2_exito}% sobre indemnización obtenida. Se presupuestará llegado el momento.`,
              { spacing: 240 },
            ),

            p("PROVISIÓN DE FONDOS", { bold: true, spacing: 160 }),
            p(
              "De acuerdo con lo anterior y a tenor del presupuesto de servicios profesionales antes indicado, corresponde al cliente el pago de la siguiente provisión de fondos:",
            ),
            tabla([
              { left: "Concepto", right: "Importes", bold: true, shade: "E5ECF4" },
              { left: "Honorarios profesionales", right: fmtEUR(honorarios_fase1) },
              { left: "I.V.A.: Tipo 21%", right: fmtEUR(iva_fase1) },
              { left: "Subtotal", right: fmtEUR(subtotal_fase1), bold: true },
              { left: "Gastos y suplidos", right: fmtEUR(gastos_suplidos) },
              { left: "Total a pagar", right: fmtEUR(total_fase1), bold: true, shade: "F4F6F8" },
            ]),

            p("Datos bancarios", { bold: true, spacing: 160 }),
            p("El pago de la provisión de fondos indicada ha de hacerse en:"),
            p("Sabadell Atlántico. C/ Velázquez, 48. 28001 Madrid"),
            p("Número de cuenta: 0081 0155 80 0001080317"),
            p("Titular: HISPAJURIS, Servicios y Gestión, S.L. CIF: B-81978066"),
            pRich([{ text: "Concepto: " }, { text: `«Reclamación interinos — ${cliente_nombre}»`, bold: true }]),
            p("Se ruega remitir justificante de pago al correo secretariado@hispajuris.es", { spacing: 240 }),

            p("CONDICIONES DEL ENCARGO", { bold: true, spacing: 160 }),
            p(
              "La ejecución de dichos trabajos profesionales se efectuará en régimen de arrendamiento de servicios, con arreglo a las normas deontológicas de la Abogacía.",
            ),
            p(
              "Tasas. Tratándose el cliente de una persona física, la presentación de la demanda está exenta del pago de tasas judiciales sin que por tanto resulte obligado al pago de cantidad alguna por este concepto.",
            ),
            p(
              "IVA. La minuta de honorarios definitiva estará sujeta al régimen fiscal de retenciones que resulte aplicable, y se incrementará con el importe del IVA que resulte procedente.",
            ),
            p(
              "Recursos. El presente presupuesto no incluye, salvo que en el mismo se exprese lo contrario, la realización, presentación y tramitación de los posibles recursos que del procedimiento del encargo principal pudieran derivarse.",
            ),
            p(
              "El cliente autoriza al despacho y en su caso al procurador interviniente, a cobrar en su nombre las cantidades depositadas a su favor en el Juzgado y a detraer de las mismas los honorarios reflejados en el presente contrato.",
            ),
            p(
              "Condena en costas del demandado. En el caso de condena en costas a la empresa demandada, la minuta de honorarios profesionales deberá ser abonada íntegramente (100%) al despacho conforme al importe tasado aprobado por resolución firme del órgano judicial competente para ello.",
              { spacing: 240 },
            ),

            p("PROTECCIÓN DE DATOS", { bold: true, spacing: 160 }),
            p(
              "El cliente autoriza expresamente al Letrado a la inclusión en sus ficheros y tratamiento de todos los datos de carácter personal que le han sido cedidos, para el mantenimiento de la relación contractual. Dichos datos permanecerán en los ficheros de CLIENTES, propiedad de HISPAJURIS, sujetos a los derechos de acceso, rectificación, cancelación y oposición de acuerdo con la Ley Orgánica de Protección de Datos. Dirección: Calle Orense, 6. Pl. 12ª. 28020 Madrid. Email: secretariado@hispajuris.es",
              { spacing: 320 },
            ),

            p(`En ${cliente_provincia}, a ${fechaHoy()}.`, { spacing: 320 }),

            firmaTable(cliente_nombre, cliente_dni, body.abogado_nombre, body.abogado_nif),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const bytes = new Uint8Array(buffer);

    // 4. Guardar en bucket
    const fechaFile = new Date().toISOString().slice(0, 10);
    const safeName = cliente_nombre.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60) || "Cliente";
    const fileName = `HojaEncargo_${safeName}_${fechaFile}.docx`;
    const storagePath = `${body.lead_id}/hoja-encargo/${Date.now()}_${fileName}`;

    const { error: upErr } = await supa.storage.from(BUCKET_DOCS).upload(storagePath, bytes, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });
    if (upErr) console.error("upload error", upErr);

    // 5. Registro en lead_documentos_generados
    const { data: docRow } = await supa
      .from("lead_documentos_generados")
      .insert({
        lead_id: body.lead_id,
        plantilla_nombre: "Hoja de Encargo",
        nombre_archivo: fileName,
        formato: "docx",
        storage_path: storagePath,
        tamano_bytes: bytes.byteLength,
        notas: JSON.stringify({
          tipo: "hoja_encargo",
          datos: {
            abogado: {
              nombre: body.abogado_nombre,
              colegio: body.abogado_colegio,
              num_colegiado: body.abogado_num_colegiado,
              domicilio: body.abogado_domicilio_profesional,
              nif: body.abogado_nif,
            },
            economico: { honorarios_fase1, iva_fase1, gastos_suplidos, total_fase1, fase2_exito: body.honorarios_fase2_exito },
            cliente: { nombre: cliente_nombre, dni: cliente_dni, provincia: cliente_provincia },
          },
        }),
      })
      .select("id")
      .maybeSingle();

    // 6. Devolver base64 para descarga directa
    const b64 = btoa(String.fromCharCode(...bytes));

    return new Response(
      JSON.stringify({
        ok: true,
        file_name: fileName,
        storage_path: storagePath,
        documento_id: docRow?.id ?? null,
        base64: b64,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generar-hoja-encargo error:", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function abogadoLine(nombre: string): string {
  return nombre || "";
}
