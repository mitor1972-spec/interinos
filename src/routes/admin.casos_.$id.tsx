import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Phone,
  Mail,
  FileText,
  Loader2,
  Scale,
  AlertCircle,
  CheckCircle2,
  Award,
  Pencil,
  History,
  Trash2,
  Send,
  Download,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EnviarEmailModal } from "@/components/admin/EnviarEmailModal";
import { LeadEditModal } from "@/components/admin/LeadEditModal";
import { LeadHistorial } from "@/components/admin/LeadHistorial";
import { LeadDocumentos } from "@/components/admin/LeadDocumentos";
import { LeadDatosExtraidos } from "@/components/admin/LeadDatosExtraidos";
import { LeadGenerarDocumento } from "@/components/admin/LeadGenerarDocumento";
import { LeadValidacionIA } from "@/components/admin/LeadValidacionIA";
import { LeadValoracion } from "@/components/perito/LeadValoracion";
import { AsignacionAbogado } from "@/components/admin/AsignacionAbogado";
import { AsignacionPerito } from "@/components/admin/AsignacionPerito";
import { PagoManualCompact } from "@/components/admin/PagoManualCompact";
import { descargarInformePDF, descargarInformeWord } from "@/lib/informeCaso";
import {
  ESTADOS,
  semaforoConfig,
  perfilConfig,
  estadoBadgeClass,
  reclamacionesPorPerfil,
  formatDate,
  formatDateShort,
  type Lead,
  type EstadoCaso,
} from "@/lib/leads";
import {
  TIPOS_RECLAMACION,
  AREAS_SECTOR,
  RESULTADOS_CONTACTO,
  SIGUIENTES_ACCIONES,
  URGENCIAS_PERCIBIDAS,
  MOTIVOS_POR_TIPO,
} from "@/lib/gestionHispajuris";
import { patchLead } from "@/lib/leadsGestion";
import { InlineSelect, InlineText, InlineToggle } from "@/components/admin/InlineField";
import { listarAbogados, type AbogadoConDespacho } from "@/lib/abogados";
import { useImpersonation } from "@/lib/impersonation";

export const Route = createFileRoute("/admin/casos_/$id")({
  head: () => ({
    meta: [
      { title: "Ficha del caso · Hispajuris · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCasoDetalle,
});

function AdminCasoDetalle() {
  const { id } = Route.useParams();
  const { session, isLawyer, isAdmin, loading: authLoading } = useAuth();
  const { role: viewRole } = useImpersonation();
  const navigate = useNavigate();

  // El admin puede impersonar como abogado → ocultar herramientas exclusivas.
  const viewAsAdmin = isAdmin && viewRole === "admin";

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [historialKey, setHistorialKey] = useState(0);
  const [, setDocumentosCount] = useState(0);
  const [abogados, setAbogados] = useState<AbogadoConDespacho[]>([]);
  const [busyExport, setBusyExport] = useState<"pdf" | "word" | null>(null);

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  const fetchLead = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads_interinos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast.error("Error cargando caso: " + error.message);
      return;
    }
    if (!data) {
      toast.error("Caso no encontrado");
      navigate({ to: "/admin/casos" });
      return;
    }
    setLead(data);
    if (!data.revisado) {
      const { data: upd } = await supabase
        .from("leads_interinos")
        .update({ revisado: true, revisado_at: new Date().toISOString() })
        .eq("id", data.id)
        .select()
        .single();
      if (upd) setLead(upd);
    }
  };

  useEffect(() => {
    if (session && isLawyer) {
      fetchLead();
      listarAbogados().then((list) => setAbogados(list.filter((a) => a.activo)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isLawyer, id]);

  const updateField = async <K extends keyof Lead>(field: K, value: Lead[K]) => {
    if (!lead) return;
    try {
      const updated = await patchLead(lead.id, { [field]: value } as Partial<Lead>, lead);
      setLead(updated);
      setHistorialKey((k) => k + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error guardando";
      toast.error(msg);
      throw e;
    }
  };

  const updateEstado = async (nuevo: EstadoCaso) => {
    if (!lead || nuevo === lead.estado) return;
    try {
      await updateField("estado", nuevo);
      toast.success(`Estado: ${nuevo}`);
    } catch {
      /* noop */
    }
  };

  const deleteLead = async () => {
    if (!lead) return;
    const ok = confirm(
      `¿Eliminar definitivamente el caso de "${lead.nombre}"?\n\nEsta acción no se puede deshacer.`,
    );
    if (!ok) return;
    const { error } = await supabase.from("leads_interinos").delete().eq("id", lead.id);
    if (error) {
      toast.error("No se pudo eliminar el caso");
      return;
    }
    toast.success("Caso eliminado");
    navigate({ to: "/admin/casos" });
  };

  async function descargarPDF() {
    if (!lead) return;
    setBusyExport("pdf");
    try {
      await descargarInformePDF(lead);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generando PDF");
    } finally {
      setBusyExport(null);
    }
  }

  async function descargarWord() {
    if (!lead) return;
    setBusyExport("word");
    try {
      await descargarInformeWord(lead);
      toast.success("Word descargado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generando Word");
    } finally {
      setBusyExport(null);
    }
  }

  const motivoOptions = useMemo(() => {
    if (!lead?.tipo_reclamacion) return [];
    return MOTIVOS_POR_TIPO[lead.tipo_reclamacion] ?? [];
  }, [lead?.tipo_reclamacion]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!session) return null;

  if (!isLawyer) {
    return (
      <AdminLayout title="Acceso restringido">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm font-semibold text-destructive">
              Tu cuenta no tiene permisos para ver los casos.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!lead) return null;

  const sem = semaforoConfig(lead.semaforo);
  const per = perfilConfig(lead.perfil);
  const reclamaciones = reclamacionesPorPerfil(lead.perfil);

  return (
    <AdminLayout title="" subtitle="">
      {/* Breadcrumb */}
      <nav className="mb-3">
        <ol className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <li>
            <Link to="/admin" className="hover:text-foreground">Panel</Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li>
            <Link to="/admin/casos" className="hover:text-foreground">Casos</Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="font-medium text-foreground">{lead.nombre}</li>
        </ol>
      </nav>

      {/* HEADER COMPACTO */}
      <header className="mb-5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Identidad + badges */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate text-lg font-bold text-primary">{lead.nombre}</h1>
              <span className="text-xs text-muted-foreground">
                {lead.provincia} · recibido {formatDateShort(lead.created_at)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${per.className}`}
              >
                <Scale className="h-2.5 w-2.5" /> {per.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sem.className}`}
              >
                {sem.emoji} {sem.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                <Award className="h-2.5 w-2.5" /> {lead.puntuacion_viabilidad}/13
              </span>
              {lead.urgencia && (
                <span className="inline-flex rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground">
                  Urgente
                </span>
              )}
            </div>
          </div>

          {/* Acciones en línea */}
          <div className="flex flex-wrap items-center gap-1.5">
            <ActionBtn href={`tel:${lead.telefono}`} icon={Phone} label="Llamar" />
            <ActionBtn href={`mailto:${lead.email}`} icon={Mail} label="Email" />
            {viewAsAdmin && (
              <ActionBtn
                onClick={() => setEnviandoEmail(true)}
                icon={Send}
                label="Enviar al abogado"
                tone="accent"
              />
            )}
            <ActionBtn
              onClick={descargarPDF}
              icon={busyExport === "pdf" ? Loader2 : Download}
              label="PDF"
              spin={busyExport === "pdf"}
            />
            <ActionBtn
              onClick={descargarWord}
              icon={busyExport === "word" ? Loader2 : FileText}
              label="Word"
              spin={busyExport === "word"}
            />
            <ActionBtn onClick={() => setEditing(true)} icon={Pencil} label="Editar" />
            {viewAsAdmin && (
              <ActionBtn onClick={deleteLead} icon={Trash2} label="Eliminar" tone="danger" />
            )}
          </div>
        </div>
      </header>

      {/* Layout 70/30 */}
      <div className="grid gap-4 xl:grid-cols-[7fr_3fr]">
        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-4">
          {/* 1. DATOS DEL CLIENTE */}
          <Block title="Datos del cliente" tone="cliente">
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <DataRow label="Nombre completo" value={lead.nombre} />
              <DataRow
                label="Email"
                value={
                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                    {lead.email}
                  </a>
                }
              />
              <DataRow
                label="Teléfono"
                value={
                  <a href={`tel:${lead.telefono}`} className="text-primary hover:underline">
                    {lead.telefono}
                  </a>
                }
              />
              <DataRow label="Provincia" value={lead.provincia} />
              <DataRow label="Tipo de relación" value={lead.tipo_relacion} />
              <DataRow label="Administración" value={lead.administracion} />
              <DataRow label="Años de servicio" value={`${lead.anos_servicio} años`} />
              <DataRow label="Situación actual" value={lead.situacion_actual} />
              <DataRow
                label="Contratos sucesivos"
                value={lead.contratos_sucesivos ? "Sí" : "No"}
              />
              <DataRow label="Urgencia declarada" value={lead.urgencia ? "Sí" : "No"} />
            </div>
            {lead.mensaje_libre && (
              <div className="mt-3 rounded-lg bg-muted/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Mensaje del cliente
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-foreground">
                  {lead.mensaje_libre}
                </p>
              </div>
            )}
          </Block>

          {/* 2. DIAGNÓSTICO */}
          <Block title="Diagnóstico" tone="diagnostico">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-base">{sem.emoji}</span>
              <span className="font-semibold text-foreground capitalize">
                {lead.resultado_viabilidad}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="capitalize text-foreground">{lead.perfil}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold text-foreground">
                {lead.puntuacion_viabilidad}/13 puntos
              </span>
            </div>
            {lead.diagnostico_titulo && (
              <p className="mt-2 text-[13px] font-semibold text-foreground">
                {lead.diagnostico_titulo}
              </p>
            )}
            {lead.diagnostico_mensaje && (
              <p className="mt-1 text-[13px] text-muted-foreground">{lead.diagnostico_mensaje}</p>
            )}
            {lead.resultado_viabilidad !== "inviable" && (
              <>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Qué podría reclamar
                </p>
                <ul className="mt-1 space-y-1 text-[13px] text-foreground">
                  {reclamaciones.map((r) => (
                    <li key={r} className="flex gap-1.5">
                      <span className="text-primary">·</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Block>

          {/* 3. GESTIÓN HISPAJURIS */}
          <Block title="Gestión Hispajuris" tone="gestion">
            <div className="grid gap-3 sm:grid-cols-2">
              <InlineSelect
                label="Tipo de reclamación"
                value={lead.tipo_reclamacion}
                options={TIPOS_RECLAMACION}
                onSave={(v) => updateField("tipo_reclamacion", v)}
              />
              <InlineSelect
                label="Motivo específico"
                value={lead.motivo_especifico}
                options={motivoOptions.map((m) => ({ value: m, label: m }))}
                onSave={(v) => updateField("motivo_especifico", v)}
                placeholder={
                  motivoOptions.length === 0
                    ? "Selecciona primero el tipo"
                    : "Seleccionar motivo…"
                }
              />
              <InlineSelect
                label="Área / Sector"
                value={lead.area_sector}
                options={AREAS_SECTOR}
                onSave={(v) => updateField("area_sector", v)}
              />
              <InlineSelect
                label="Urgencia percibida"
                value={lead.urgencia_percibida ? String(lead.urgencia_percibida) : null}
                options={URGENCIAS_PERCIBIDAS}
                onSave={(v) =>
                  updateField(
                    "urgencia_percibida",
                    v ? (Number(v) as Lead["urgencia_percibida"]) : null,
                  )
                }
              />
              <InlineSelect
                label="Resultado del contacto"
                value={lead.resultado_contacto}
                options={RESULTADOS_CONTACTO}
                allowEmpty={false}
                onSave={async (v) => {
                  if (v) await updateField("resultado_contacto", v as Lead["resultado_contacto"]);
                }}
              />
              <InlineSelect
                label="Siguiente acción"
                value={lead.siguiente_accion}
                options={SIGUIENTES_ACCIONES}
                onSave={(v) => updateField("siguiente_accion", v)}
              />
              <InlineSelect
                label="Profesional interviniente"
                value={lead.profesional_interviniente}
                options={abogados.map((a) => ({
                  value: a.id,
                  label: `${a.nombre}${a.despachos?.nombre ? ` · ${a.despachos.nombre}` : ""}`,
                }))}
                onSave={(v) => updateField("profesional_interviniente", v)}
              />
              <InlineText
                label="Fecha solicitud inicial"
                value={lead.fecha_solicitud_inicial}
                onSave={(v) => updateField("fecha_solicitud_inicial", v)}
                type="date"
              />
            </div>
            <div className="mt-3 grid gap-3">
              <InlineText
                label="Servicio específico / notas del caso"
                value={lead.servicio_especifico}
                onSave={(v) => updateField("servicio_especifico", v)}
                multiline
                rows={3}
                placeholder="Detalle del servicio jurídico solicitado…"
              />
              <InlineText
                label="Acción pendiente"
                value={lead.accion_pendiente}
                onSave={(v) => updateField("accion_pendiente", v)}
                multiline
                rows={2}
                placeholder="Próximo paso a realizar…"
              />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <InlineToggle
                label="Encargo firmado"
                value={lead.encargo_firmado}
                onSave={(v) => updateField("encargo_firmado", v)}
              />
              <InlineToggle
                label="Cobro realizado"
                value={lead.cobro_realizado}
                onSave={(v) => updateField("cobro_realizado", v)}
              />
              <InlineToggle
                label="Factura emitida"
                value={lead.factura_emitida}
                onSave={(v) => updateField("factura_emitida", v)}
              />
              <InlineToggle
                label="Apud Acta recibido"
                value={lead.apud_acta_recibido}
                onSave={(v) => updateField("apud_acta_recibido", v)}
              />
            </div>
          </Block>

          {/* 4. DOCUMENTOS */}
          <Block title="Documentos del caso" tone="documentos">
            <LeadDocumentos
              leadId={lead.id}
              tipoRelacion={lead.tipo_relacion}
              areaSector={lead.area_sector}
              situacionActual={lead.situacion_actual}
              onChange={setDocumentosCount}
            />
          </Block>

          {/* 5. DATOS EXTRAÍDOS POR IA */}
          <Block title="Datos extraídos por IA" icon={Sparkles} tone="ia">
            <LeadDatosExtraidos leadId={lead.id} />
          </Block>

          {/* 6. VALIDACIÓN IA */}
          <Block title="Validación IA de coherencia" icon={Sparkles} tone="validacion">
            <LeadValidacionIA leadId={lead.id} />
          </Block>

          {/* 7. DESCARGAR INFORME PDF */}
          <Block title="Descargar informe PDF" icon={FileText} tone="escrito">
            <LeadGenerarDocumento lead={lead} />
          </Block>

          {/* 8. VALORACIÓN ECONÓMICA */}
          <Block title="Valoración económica" icon={Award} tone="valoracion">
            <p className="mb-2 text-[11px] text-muted-foreground">
              A rellenar por el perito asignado.
            </p>
            <LeadValoracion leadId={lead.id} canEdit={viewAsAdmin} />
          </Block>

          {/* 9. NOTAS INTERNAS */}
          <Block title="Notas internas" tone="notas">
            <InlineText
              label="Notas (solo visibles internamente)"
              value={lead.notas_abogado}
              onSave={(v) => updateField("notas_abogado", v)}
              multiline
              rows={5}
              placeholder="Anotaciones internas del despacho…"
            />
          </Block>

          {/* 10. HISTORIAL */}
          <Block title="Historial de cambios" icon={History} tone="historial">
            <LeadHistorial leadId={lead.id} reloadKey={historialKey} />
          </Block>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-4">
          {/* W1 — ESTADO */}
          <Widget title="Estado del caso">
            <div className="space-y-1.5">
              {ESTADOS.map((e) => {
                const active = lead.estado === e;
                return (
                  <button
                    key={e}
                    onClick={() => updateEstado(e)}
                    className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition ${
                      active
                        ? estadoBadgeClass(e) + " ring-1 ring-accent/40"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{e}</span>
                    {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </Widget>

          {/* W2 — PAGO */}
          <Widget title="Pago Fase I">
            <PagoManualCompact
              lead={lead}
              onSaved={(updated) => {
                setLead(updated);
                setHistorialKey((k) => k + 1);
              }}
            />
          </Widget>

          {/* W3 — ABOGADO ASIGNADO (solo admin) */}
          {viewAsAdmin && (
            <Widget title="Abogado asignado">
              <AsignacionAbogado
                lead={lead}
                onSaved={(updated) => {
                  setLead(updated);
                  setHistorialKey((k) => k + 1);
                }}
              />
            </Widget>
          )}

          {/* W4 — ACCIONES RÁPIDAS */}
          <Widget title="Acciones rápidas">
            <div className="grid gap-1.5">
              <QuickAction href={`tel:${lead.telefono}`} icon={Phone} label="Llamar al cliente" />
              <QuickAction href={`mailto:${lead.email}`} icon={Mail} label="Enviar email" />
              {viewAsAdmin && (
                <QuickAction
                  onClick={() => setEnviandoEmail(true)}
                  icon={Send}
                  label="Enviar al abogado"
                />
              )}
              <button
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-[12px] font-semibold text-muted-foreground"
                title="Próximamente"
              >
                <Download className="h-3.5 w-3.5" /> Exportar a Sheets
              </button>
            </div>
          </Widget>

          {/* W5 — PERITO */}
          <Widget title="Perito asignado">
            <AsignacionPerito leadId={lead.id} canManage={viewAsAdmin} />
          </Widget>

          {/* Metadatos pequeños */}
          <p className="text-[10px] text-muted-foreground">
            ID: {lead.id.slice(0, 8)} · creado {formatDate(lead.created_at)}
          </p>
        </div>
      </div>

      {editing && (
        <LeadEditModal
          lead={lead}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setLead(updated);
            setHistorialKey((k) => k + 1);
          }}
        />
      )}

      {enviandoEmail && (
        <EnviarEmailModal
          lead={lead}
          onClose={() => setEnviandoEmail(false)}
          onSent={() => setHistorialKey((k) => k + 1)}
        />
      )}
    </AdminLayout>
  );
}

/* ---------------- helpers presentacionales ---------------- */

function ActionBtn({
  href,
  onClick,
  icon: Icon,
  label,
  tone,
  spin,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "accent" | "danger";
  spin?: boolean;
}) {
  const cls =
    tone === "danger"
      ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
      : tone === "accent"
        ? "border-accent/40 bg-accent/10 text-accent-foreground hover:bg-accent/20"
        : "border-border bg-background text-foreground hover:bg-muted";
  const inner = (
    <>
      <Icon className={`h-3.5 w-3.5 ${spin ? "animate-spin" : ""}`} /> {label}
    </>
  );
  const className = `inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${cls}`;
  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function QuickAction({
  href,
  onClick,
  icon: Icon,
  label,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const className =
    "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted";
  const inner = (
    <>
      <Icon className="h-3.5 w-3.5" /> {label}
    </>
  );
  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

type BlockTone =
  | "cliente"
  | "diagnostico"
  | "gestion"
  | "documentos"
  | "ia"
  | "validacion"
  | "escrito"
  | "valoracion"
  | "notas"
  | "historial";

// Solo 3 colores alternando: A=azul marino, B=verde oscuro, C=gris oscuro
const COLOR_A = "#1a3a5c";
const COLOR_B = "#15803d";
const COLOR_C = "#374151";
// Body bg coordinado por color de cabecera
const BODY_A = "#f0f4f8"; // azul muy claro
const BODY_B = "#f0fdf4"; // verde muy claro
const BODY_C = "#f9fafb"; // gris muy claro

const BLOCK_TONES: Record<BlockTone, { header: string; body: string }> = {
  cliente:    { header: COLOR_A, body: BODY_A },
  diagnostico:{ header: COLOR_B, body: BODY_B },
  gestion:    { header: COLOR_C, body: BODY_C },
  documentos: { header: COLOR_A, body: BODY_A },
  ia:         { header: COLOR_B, body: BODY_B },
  validacion: { header: COLOR_C, body: BODY_C },
  escrito:    { header: COLOR_A, body: BODY_A },
  valoracion: { header: COLOR_B, body: BODY_B },
  notas:      { header: COLOR_C, body: BODY_C },
  historial:  { header: COLOR_C, body: BODY_C },
};

function Block({
  title,
  icon: Icon,
  tone,
  badge,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: BlockTone;
  badge?: string;
  children: React.ReactNode;
}) {
  const colors = tone ? BLOCK_TONES[tone] : null;
  if (!colors) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-1.5 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {title}
        </h3>
        <div>{children}</div>
      </section>
    );
  }
  return (
    <section
      className="overflow-hidden"
      style={{
        backgroundColor: colors.body,
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2"
        style={{
          backgroundColor: colors.header,
          padding: "10px 16px",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <h3
          className="flex items-center gap-2 text-white"
          style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {title}
        </h3>
        {badge && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: "16px", borderRadius: "0 0 8px 8px" }}>{children}</div>
    </section>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "2px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "12px",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}
