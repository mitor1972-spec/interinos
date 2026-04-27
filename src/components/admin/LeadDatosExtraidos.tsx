import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Briefcase,
  Euro,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  listarExtracciones,
  lanzarExtraccion,
  validarExtraccion,
  estadoLabel,
  estadoBadgeClass,
  type Extraccion,
} from "@/lib/extracciones";
import { listarDocumentos, type LeadDocumento } from "@/lib/documentos";

interface Props {
  leadId: string;
}

// ─────────── helpers ───────────
function safeStr(v: unknown): string {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}
function fmtFecha(v: unknown): string {
  if (!v || typeof v !== "string") return "—";
  // YYYY-MM-DD → DD/MM/YYYY
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return v;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
function parseDate(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function diffMeses(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24 * 30.4375));
}
function fmtEUR(v: unknown): string {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(v);
}

// ─────────── tipos cronología/economía ───────────
interface PuntoCronologia {
  fechaInicio: Date;
  fechaFin: Date | null;
  tipo: string;
  plaza: string;
  administracion: string;
  origen: "contrato" | "vida_laboral" | "cese";
  duracionMeses: number | null;
  esCese?: boolean;
}

function construirCronologia(
  exs: Extraccion[],
): { puntos: PuntoCronologia[]; totalMeses: number } {
  const puntos: PuntoCronologia[] = [];

  for (const ex of exs) {
    if (ex.estado !== "completado" && ex.estado !== "validado") continue;
    const d = (ex.datos ?? {}) as any;

    if (ex.categoria === "contrato") {
      const ini = parseDate(d.fecha_inicio);
      if (!ini) continue;
      const fin = parseDate(d.fecha_fin);
      puntos.push({
        fechaInicio: ini,
        fechaFin: fin,
        tipo: safeStr(d.tipo),
        plaza: safeStr(d.plaza_o_puesto),
        administracion: safeStr(d.administracion),
        origen: "contrato",
        duracionMeses:
          typeof d.duracion_meses === "number"
            ? d.duracion_meses
            : ini && fin
              ? diffMeses(ini, fin)
              : null,
      });
    } else if (ex.categoria === "vida_laboral" && Array.isArray(d.periodos)) {
      for (const p of d.periodos) {
        const ini = parseDate(p?.fecha_inicio);
        if (!ini) continue;
        const fin = parseDate(p?.fecha_fin);
        puntos.push({
          fechaInicio: ini,
          fechaFin: fin,
          tipo: safeStr(p?.tipo),
          plaza: safeStr(p?.plaza_o_puesto),
          administracion: safeStr(p?.administracion),
          origen: "vida_laboral",
          duracionMeses: ini && fin ? diffMeses(ini, fin) : null,
        });
      }
    } else if (ex.categoria === "cese") {
      const f = parseDate(d.fecha_cese);
      if (!f) continue;
      puntos.push({
        fechaInicio: f,
        fechaFin: f,
        tipo: `Cese: ${safeStr(d.tipo_resolucion)}`,
        plaza: "—",
        administracion: safeStr(d.administracion),
        origen: "cese",
        duracionMeses: 0,
        esCese: true,
      });
    }
  }

  puntos.sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime());

  // Total meses encadenados (suma de duraciones de contratos/períodos no-cese)
  const totalMeses = puntos
    .filter((p) => !p.esCese && p.duracionMeses && p.duracionMeses > 0)
    .reduce((acc, p) => acc + (p.duracionMeses ?? 0), 0);

  return { puntos, totalMeses };
}

interface Alerta {
  tono: "warning" | "danger";
  titulo: string;
  texto: string;
}

function calcularAlertas(
  puntos: PuntoCronologia[],
  totalMeses: number,
  totalAnosVidaLaboral: number | null,
): Alerta[] {
  const alertas: Alerta[] = [];
  const aniosTotales = totalAnosVidaLaboral ?? totalMeses / 12;

  // Plaza vacante > 3 años (interinidad por vacante)
  // Detectamos contratos/períodos individuales > 36 meses
  const largo = puntos.find(
    (p) => !p.esCese && (p.duracionMeses ?? 0) > 36,
  );
  if (largo) {
    alertas.push({
      tono: "danger",
      titulo: "Plaza vacante cubierta más de 3 años",
      texto: `Detectado nombramiento/contrato de ${largo.duracionMeses} meses (${fmtFecha(
        largo.fechaInicio.toISOString(),
      )} → ${fmtFecha(largo.fechaFin?.toISOString() ?? "")}). Supera el límite del art. 10 EBEP / Directiva 1999/70/CE.`,
    });
  }
  // Encadenamiento > 24 meses (art. 15.5 ET)
  if (totalMeses > 24) {
    alertas.push({
      tono: "warning",
      titulo: "Encadenamiento superior a 24 meses",
      texto: `Suma de períodos: ~${totalMeses} meses. Supera el límite del art. 15.5 ET para contratos temporales encadenados.`,
    });
  }
  if (aniosTotales >= 3) {
    alertas.push({
      tono: "warning",
      titulo: `Más de ${Math.floor(aniosTotales)} años de servicios prestados`,
      texto:
        "La doctrina TJUE (asuntos Sánchez Ruiz, IMIDRA, etc.) considera abusiva la temporalidad estructural prolongada en el sector público.",
    });
  }
  return alertas;
}

interface ResumenEconomico {
  salarioBrutoMensual: number | null;
  salarioBrutoAnual: number | null;
  salarioDiario: number | null;
  totalDiasServicio: number | null;
  indemnizSistemaActual: number | null; // 20 días/año, máx 12 mensualidades
  indemnizTjueSinTope: number | null; // 33 días/año, sin tope
  diferenciaPerjuicio: number | null;
}

function calcularResumenEconomico(
  exs: Extraccion[],
  totalMeses: number,
  totalAnosVidaLaboral: number | null,
): ResumenEconomico {
  // Toma la última nómina con salario bruto
  const nominas = exs
    .filter((e) => e.categoria === "nomina" && (e.estado === "completado" || e.estado === "validado"))
    .map((e) => e.datos as any)
    .filter((d) => typeof d?.salario_bruto_mensual === "number");

  const salarioBrutoMensual = nominas.length
    ? nominas.reduce((a, n) => a + n.salario_bruto_mensual, 0) / nominas.length
    : null;

  // Anual: prefiere el que indique la nómina si existe, si no ×14
  const anualDeclarado = nominas
    .map((n) => n.salario_bruto_anual_estimado)
    .find((v) => typeof v === "number");
  const salarioBrutoAnual =
    typeof anualDeclarado === "number"
      ? anualDeclarado
      : salarioBrutoMensual !== null
        ? salarioBrutoMensual * 14
        : null;

  const salarioDiario = salarioBrutoAnual !== null ? salarioBrutoAnual / 365 : null;

  const anios = totalAnosVidaLaboral ?? totalMeses / 12;
  const totalDiasServicio = anios > 0 ? Math.round(anios * 365) : null;

  // Indemnización sistema actual (laboral): 20 días/año, máx 12 mensualidades
  const indemnizSistemaActual =
    salarioDiario !== null && anios > 0
      ? Math.min(
          salarioDiario * 20 * anios,
          (salarioBrutoMensual ?? 0) * 12,
        )
      : null;

  // TJUE (criterio reclamación): 33 días/año sin tope (asimilable a despido improcedente)
  const indemnizTjueSinTope =
    salarioDiario !== null && anios > 0 ? salarioDiario * 33 * anios : null;

  const diferenciaPerjuicio =
    indemnizSistemaActual !== null && indemnizTjueSinTope !== null
      ? indemnizTjueSinTope - indemnizSistemaActual
      : null;

  return {
    salarioBrutoMensual,
    salarioBrutoAnual,
    salarioDiario,
    totalDiasServicio,
    indemnizSistemaActual,
    indemnizTjueSinTope,
    diferenciaPerjuicio,
  };
}

// ─────────── componente ───────────
export function LeadDatosExtraidos({ leadId }: Props) {
  const [exs, setExs] = useState<Extraccion[]>([]);
  const [docs, setDocs] = useState<LeadDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [reintentando, setReintentando] = useState<string | null>(null);
  const [validando, setValidando] = useState<string | null>(null);
  const [extrayendoTodo, setExtrayendoTodo] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const [e, d] = await Promise.all([
      listarExtracciones(leadId),
      listarDocumentos(leadId),
    ]);
    setExs(e);
    setDocs(d);
    setLoading(false);
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const docNombre = (id: string) =>
    docs.find((d) => d.id === id)?.nombre_original ?? "(documento eliminado)";

  const { puntos, totalMeses } = useMemo(() => construirCronologia(exs), [exs]);

  // total años desde la vida laboral si existe
  const totalAnosVL = useMemo(() => {
    const vl = exs.find(
      (e) => e.categoria === "vida_laboral" && (e.estado === "completado" || e.estado === "validado"),
    );
    const v = (vl?.datos as any)?.total_anos;
    return typeof v === "number" ? v : null;
  }, [exs]);

  const alertas = useMemo(
    () => calcularAlertas(puntos, totalMeses, totalAnosVL),
    [puntos, totalMeses, totalAnosVL],
  );

  const economia = useMemo(
    () => calcularResumenEconomico(exs, totalMeses, totalAnosVL),
    [exs, totalMeses, totalAnosVL],
  );

  // Datos del DNI para mostrar identidad
  const dni = useMemo(() => {
    const d = exs.find((e) => e.categoria === "dni" && (e.estado === "completado" || e.estado === "validado"));
    return (d?.datos as any) ?? null;
  }, [exs]);

  const handleReintentar = async (extraccionId: string, docId: string) => {
    setReintentando(extraccionId);
    const r = await lanzarExtraccion(docId, { force: true });
    setReintentando(null);
    if (!r.ok) {
      toast.error(r.error ?? "Error reintentando");
      return;
    }
    toast.success("Reintentando extracción…");
    setTimeout(() => void cargar(), 1500);
  };

  const handleValidar = async (extraccionId: string) => {
    setValidando(extraccionId);
    const r = await validarExtraccion(extraccionId);
    setValidando(null);
    if (!r.ok) {
      toast.error(r.error ?? "Error validando");
      return;
    }
    toast.success("Datos validados");
    void cargar();
  };

  // Identifica documentos sin extracción asociada
  const docIdsConExtraccion = useMemo(
    () => new Set(exs.map((e) => e.documento_id)),
    [exs],
  );
  const docsSinExtraer = useMemo(
    () => docs.filter((d) => !docIdsConExtraccion.has(d.id)),
    [docs, docIdsConExtraccion],
  );

  // Última fecha de extracción/validación
  const ultimaActualizacion = useMemo(() => {
    if (exs.length === 0) return null;
    const ts = exs
      .map((e) => new Date(e.validado_at ?? e.updated_at).getTime())
      .filter((n) => !isNaN(n));
    if (ts.length === 0) return null;
    return new Date(Math.max(...ts));
  }, [exs]);

  const hayProcesando = exs.some(
    (e) => e.estado === "procesando" || e.estado === "pendiente",
  );

  const handleExtraerTodos = async (force = false) => {
    const objetivo = force ? docs : docsSinExtraer;
    if (objetivo.length === 0) {
      toast.info("No hay documentos para procesar.");
      return;
    }
    setExtrayendoTodo(true);
    let okCount = 0;
    for (const d of objetivo) {
      const r = await lanzarExtraccion(d.id, { force });
      if (r.ok) okCount++;
    }
    setExtrayendoTodo(false);
    toast.success(`Lanzada extracción de ${okCount}/${objetivo.length} documento(s).`);
    setTimeout(() => void cargar(), 2000);
  };

  // ─── Cabecera de control siempre visible ───
  const renderCabecera = () => {
    // Caso 1: sin documentos subidos
    if (docs.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Sube documentos para poder extraer datos automáticamente.
          </p>
        </div>
      );
    }

    // Caso 2: hay documentos pero no se ha extraído nada
    if (exs.length === 0) {
      return (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-primary">
                Listos para analizar con IA
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {docs.length} documento{docs.length === 1 ? "" : "s"} subido
                {docs.length === 1 ? "" : "s"} · sin analizar todavía.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExtraerTodos(false)}
              disabled={extrayendoTodo}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {extrayendoTodo ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando documentos…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  🔍 Extraer datos con IA
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    // Caso 3: ya hay extracciones — mostrar controles
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {ultimaActualizacion && (
              <span>
                Última extracción:{" "}
                <strong className="text-foreground">
                  {ultimaActualizacion.toLocaleString("es-ES", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </strong>
              </span>
            )}
            {hayProcesando && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                <Loader2 className="h-3 w-3 animate-spin" /> procesando…
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {docsSinExtraer.length > 0 && (
              <button
                type="button"
                onClick={() => handleExtraerTodos(false)}
                disabled={extrayendoTodo}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {extrayendoTodo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Analizar {docsSinExtraer.length} nuevo
                {docsSinExtraer.length === 1 ? "" : "s"}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleExtraerTodos(true)}
              disabled={extrayendoTodo}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
            >
              {extrayendoTodo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              🔄 Volver a extraer todo
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos extraídos…
      </div>
    );
  }

  // Si no hay documentos ni extracciones, solo mostramos la cabecera
  if (docs.length === 0 && exs.length === 0) {
    return renderCabecera();
  }

  // Si hay docs pero ninguna extracción, mostramos solo la cabecera con el botón
  if (exs.length === 0) {
    return renderCabecera();
  }

  const pendientes = exs.filter((e) => e.estado !== "validado");

  return (
    <div className="space-y-6">
      {/* Identidad (DNI) */}
      {dni && (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Identidad (extraída del DNI)
          </div>
          <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-3">
            <div>
              <span className="text-xs text-muted-foreground">Nombre</span>
              <div className="font-medium">{safeStr(dni.nombre_completo ?? `${dni.nombre ?? ""} ${dni.apellidos ?? ""}`.trim())}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">DNI</span>
              <div className="font-medium">{safeStr(dni.numero_dni)}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Fecha nacimiento</span>
              <div className="font-medium">{fmtFecha(dni.fecha_nacimiento)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Cronología */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Cronología de nombramientos / contratos
          </h3>
          {totalMeses > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              Total encadenado ≈ {totalMeses} meses (
              {(totalMeses / 12).toFixed(1)} años)
            </span>
          )}
        </div>
        {puntos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aún no se han extraído nombramientos ni vida laboral.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Inicio</th>
                  <th className="px-3 py-2 text-left font-medium">Fin</th>
                  <th className="px-3 py-2 text-left font-medium">Meses</th>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">Plaza/puesto</th>
                  <th className="px-3 py-2 text-left font-medium">Administración</th>
                  <th className="px-3 py-2 text-left font-medium">Origen</th>
                </tr>
              </thead>
              <tbody>
                {puntos.map((p, i) => (
                  <tr
                    key={i}
                    className={`border-t border-border ${p.esCese ? "bg-destructive/5" : ""}`}
                  >
                    <td className="px-3 py-2">{fmtFecha(p.fechaInicio.toISOString())}</td>
                    <td className="px-3 py-2">
                      {p.fechaFin ? fmtFecha(p.fechaFin.toISOString()) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {p.duracionMeses && p.duracionMeses > 0 ? `${p.duracionMeses}` : p.esCese ? "—" : "actual"}
                    </td>
                    <td className="px-3 py-2">{p.tipo}</td>
                    <td className="px-3 py-2">{p.plaza}</td>
                    <td className="px-3 py-2">{p.administracion}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {p.origen === "contrato"
                        ? "Nombramiento"
                        : p.origen === "vida_laboral"
                          ? "Vida laboral"
                          : "Cese"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alertas legales */}
      {alertas.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Scale className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold text-foreground">
              Alertas legales
            </h3>
          </div>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div
                key={i}
                className={`flex gap-3 rounded-lg border px-3 py-2 ${
                  a.tono === "danger"
                    ? "border-destructive/40 bg-destructive/5 text-destructive"
                    : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                }`}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold">{a.titulo}</div>
                  <div className="text-xs opacity-90">{a.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen económico */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Euro className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Resumen económico estimado
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CeldaEconomica label="Salario bruto mensual" valor={fmtEUR(economia.salarioBrutoMensual)} />
          <CeldaEconomica label="Salario bruto anual (estimado)" valor={fmtEUR(economia.salarioBrutoAnual)} />
          <CeldaEconomica label="Salario diario" valor={fmtEUR(economia.salarioDiario)} />
          <CeldaEconomica
            label="Días de servicio reconocidos"
            valor={economia.totalDiasServicio !== null ? `${economia.totalDiasServicio} días` : "—"}
          />
          <CeldaEconomica
            label="Indemnización sistema actual (20 d/año, máx 12 mens.)"
            valor={fmtEUR(economia.indemnizSistemaActual)}
            tono="muted"
          />
          <CeldaEconomica
            label="Indemnización TJUE (33 d/año, sin tope)"
            valor={fmtEUR(economia.indemnizTjueSinTope)}
            tono="primary"
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="rounded-lg border border-success/40 bg-success/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-success">
                Diferencia / perjuicio estimado a reclamar
              </div>
              <div className="mt-1 text-2xl font-bold text-success">
                {fmtEUR(economia.diferenciaPerjuicio)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Cálculo orientativo a partir de la doctrina TJUE para abuso de
                temporalidad. No sustituye la valoración del perito.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Listado de extracciones por documento (con validar) */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Documentos analizados
          </h3>
          {pendientes.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {pendientes.length} pendiente(s) de validar
            </span>
          )}
        </div>
        <div className="space-y-2">
          {exs.map((e) => (
            <div
              key={e.id}
              className="rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${estadoBadgeClass(
                    e.estado,
                  )}`}
                >
                  {estadoLabel(e.estado)}
                </span>
                <span className="text-sm font-medium">{docNombre(e.documento_id)}</span>
                <span className="text-xs text-muted-foreground">
                  · {e.categoria}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {e.estado === "error" && (
                    <button
                      type="button"
                      onClick={() => handleReintentar(e.id, e.documento_id)}
                      disabled={reintentando === e.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      {reintentando === e.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Reintentar
                    </button>
                  )}
                  {e.estado === "completado" && (
                    <button
                      type="button"
                      onClick={() => handleValidar(e.id)}
                      disabled={validando === e.id}
                      className="inline-flex items-center gap-1 rounded-md bg-success px-2 py-1 text-xs font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
                    >
                      {validando === e.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3 w-3" />
                      )}
                      Validar datos
                    </button>
                  )}
                  {e.estado === "validado" && (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Validado
                    </span>
                  )}
                </div>
              </div>
              {e.error_mensaje && (
                <p className="mt-1 text-xs text-destructive">{e.error_mensaje}</p>
              )}
              {e.datos && Object.keys(e.datos as object).length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    Ver datos extraídos
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-2 text-xs">
                    {JSON.stringify(e.datos, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CeldaEconomica({
  label,
  valor,
  tono = "default",
}: {
  label: string;
  valor: string;
  tono?: "default" | "muted" | "primary";
}) {
  const cls =
    tono === "primary"
      ? "border-primary/40 bg-primary/5"
      : tono === "muted"
        ? "border-border bg-muted/30"
        : "border-border bg-card";
  return (
    <div className={`rounded-lg border px-3 py-2 ${cls}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-foreground">{valor}</div>
    </div>
  );
}
