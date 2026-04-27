import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Loader2,
  Scale,
  AlertCircle,
  CheckCircle2,
  Award,
  Pencil,
  History,
  PhoneCall,
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
import { LeadValoracion } from "@/components/perito/LeadValoracion";
import { CompletitudBar } from "@/components/admin/CompletitudBar";
import { AsignacionAbogado } from "@/components/admin/AsignacionAbogado";
import { PagoManualForm } from "@/components/admin/PagoManualForm";
import {
  ESTADOS,
  semaforoConfig,
  perfilConfig,
  estadoBadgeClass,
  reclamacionesPorPerfil,
  formatDate,
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
  labelSiguienteAccion,
} from "@/lib/gestionHispajuris";
import { patchLead } from "@/lib/leadsGestion";
import { InlineSelect, InlineText, InlineToggle } from "@/components/admin/InlineField";
import { listarAbogados, type AbogadoConDespacho } from "@/lib/abogados";

export const Route = createFileRoute("/admin/casos_/$id")({
  head: () => ({
    meta: [
      { title: "Ficha del caso · Hispajuris · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCasoDetalle,
});

function motivoUrgencia(lead: Lead): string {
  const sit = (lead.situacion_actual || "").toLowerCase();
  if (sit.includes("cesado") || sit.includes("cese"))
    return "Cese reciente o inminente — requiere actuación inmediata";
  if (lead.urgencia || sit.includes("plazo") || sit.includes("recurso"))
    return "Plazo o recurso en marcha — tiempo crítico";
  if (sit.includes("indefinido no fijo"))
    return "Reconocido como indefinido no fijo — quiere reclamar más";
  if (sit.includes("estabilización") || sit.includes("estabilizacion"))
    return "Proceso de estabilización activo que afecta a la plaza";
  return "Caso prioritario — revisar con el cliente";
}

function AdminCasoDetalle() {
  const { id } = Route.useParams();
  const { session, isLawyer, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [historialKey, setHistorialKey] = useState(0);
  const [documentosCount, setDocumentosCount] = useState(0);
  const [abogados, setAbogados] = useState<AbogadoConDespacho[]>([]);

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
    // Marcar como revisado al abrir
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
      /* toast in updateField */
    }
  };

  const toggleUrgente = async () => {
    if (!lead) return;
    const nuevo = !lead.urgencia;
    const nuevoSemaforo = nuevo
      ? "rojo"
      : lead.semaforo === "rojo"
        ? "ambar"
        : lead.semaforo;
    const nuevoResultado = nuevo
      ? lead.resultado_viabilidad === "inviable"
        ? "inviable"
        : "urgente"
      : lead.resultado_viabilidad === "urgente"
        ? "viable"
        : lead.resultado_viabilidad;
    try {
      const updated = await patchLead(
        lead.id,
        {
          urgencia: nuevo,
          semaforo: nuevoSemaforo,
          resultado_viabilidad: nuevoResultado,
        },
        lead,
      );
      setLead(updated);
      setHistorialKey((k) => k + 1);
      toast.success(nuevo ? "Marcado como urgente" : "Urgencia retirada");
    } catch (e) {
      toast.error("No se pudo actualizar la urgencia");
    }
  };

  const deleteLead = async () => {
    if (!lead) return;
    const ok = confirm(
      `¿Eliminar definitivamente el caso de "${lead.nombre}"?\n\nEsta acción no se puede deshacer y borrará también sus documentos, valoraciones e historial.`,
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

  const headerActions = (
    <>
      <a
        href={`tel:${lead.telefono}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
        title="Llamar al cliente"
      >
        <Phone className="h-3.5 w-3.5" /> Llamar
      </a>
      <a
        href={`mailto:${lead.email}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
        title="Enviar email al cliente"
      >
        <Mail className="h-3.5 w-3.5" /> Email
      </a>
      {isAdmin && (
        <button
          onClick={() => setEnviandoEmail(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/20"
          title="Enviar caso al abogado"
        >
          <Send className="h-3.5 w-3.5" /> Enviar al abogado
        </button>
      )}
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
      >
        <Pencil className="h-3.5 w-3.5" /> Editar
      </button>
      {isAdmin && (
        <button
          onClick={deleteLead}
          className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15"
        >
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </button>
      )}
    </>
  );

  return (
    <AdminLayout title="" subtitle="" actions={headerActions}>
      {/* Breadcrumb + back */}
      <nav className="mb-4 flex items-center justify-between">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <li>
            <Link to="/admin" className="hover:text-foreground">
              Panel
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li>
            <Link to="/admin/casos" className="hover:text-foreground">
              Casos
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="font-medium text-foreground">{lead.nombre}</li>
        </ol>
        <Link
          to="/admin/casos"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a casos
        </Link>
      </nav>

      {/* Cabecera del caso */}
      <header className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${sem.className}`}
          >
            <span>{sem.emoji}</span> {sem.label}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${per.className}`}
          >
            <Scale className="h-3 w-3" /> {per.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
            <Award className="h-3 w-3" /> {lead.puntuacion_viabilidad} pts
          </span>
          {lead.urgencia && (
            <button
              onClick={toggleUrgente}
              className="inline-flex rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground hover:bg-destructive/90"
              title="Quitar urgencia"
            >
              Urgente · clic para quitar
            </button>
          )}
          {!lead.urgencia && (
            <button
              onClick={toggleUrgente}
              className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted"
              title="Marcar como urgente"
            >
              Marcar urgente
            </button>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-primary">{lead.nombre}</h1>
        <p className="text-xs text-muted-foreground">
          {lead.tipo_relacion} · recibido {formatDate(lead.created_at)}
        </p>
        <CompletitudBar lead={lead} documentosCount={documentosCount} />
      </header>

      {/* Layout 60/40 */}
      <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-5">
          {/* Alerta urgente */}
          {(lead.urgencia || lead.semaforo === "rojo") && (
            <Section title="🔴 Caso urgente" tone="danger">
              <p className="text-sm font-semibold text-destructive">{motivoUrgencia(lead)}</p>
              <a
                href={`tel:${lead.telefono}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
              >
                <PhoneCall className="h-3.5 w-3.5" /> Llamar ahora →
              </a>
            </Section>
          )}

          {/* Contacto */}
          <Section title="Contacto" icon={Mail}>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Row icon={Mail} label="Email">
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                  {lead.email}
                </a>
              </Row>
              <Row icon={Phone} label="Teléfono">
                <a href={`tel:${lead.telefono}`} className="text-primary hover:underline">
                  {lead.telefono}
                </a>
              </Row>
              <Row icon={MapPin} label="Provincia">
                {lead.provincia}
              </Row>
              <Row icon={Calendar} label="Recibido">
                {formatDate(lead.created_at)}
              </Row>
            </div>
          </Section>

          {/* Diagnóstico */}
          <Section title="Diagnóstico" icon={Sparkles}>
            {lead.diagnostico_titulo && (
              <p className="text-sm font-bold text-foreground">{lead.diagnostico_titulo}</p>
            )}
            {lead.diagnostico_mensaje && (
              <p className="mt-1 text-sm text-muted-foreground">{lead.diagnostico_mensaje}</p>
            )}
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
              <MiniStat label="Resultado" value={lead.resultado_viabilidad} />
              <MiniStat label="Perfil" value={lead.perfil} />
              <MiniStat
                label="Puntuación"
                value={`${lead.puntuacion_viabilidad} / 13`}
              />
            </div>
            {lead.resultado_viabilidad !== "inviable" && (
              <ul className="mt-4 space-y-1.5 text-sm text-foreground/85">
                {reclamaciones.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Detalles del caso */}
          <Section title="Detalles del caso" icon={FileText}>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Administración">{lead.administracion}</Row>
              <Row label="Antigüedad">{lead.anos_servicio} años</Row>
              <Row label="Situación actual">{lead.situacion_actual}</Row>
              <Row label="Contratos sucesivos">{lead.contratos_sucesivos ? "Sí" : "No"}</Row>
            </div>
            {lead.mensaje_libre && (
              <div className="mt-4 rounded-xl border border-border bg-background p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Mensaje del cliente
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {lead.mensaje_libre}
                </p>
              </div>
            )}
          </Section>

          {/* GESTIÓN HISPAJURIS — editable inline */}
          <Section title="Gestión Hispajuris" icon={Pencil} highlight>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  updateField("urgencia_percibida", v ? (Number(v) as Lead["urgencia_percibida"]) : null)
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
            <div className="mt-4 grid gap-4">
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
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
          </Section>

          {/* Documentos */}
          <Section title="Documentos del caso" icon={FileText}>
            <LeadDocumentos
              leadId={lead.id}
              tipoRelacion={lead.tipo_relacion}
              areaSector={lead.area_sector}
              situacionActual={lead.situacion_actual}
              onChange={setDocumentosCount}
            />
          </Section>

          {/* Datos extraídos por IA */}
          <Section title="Datos extraídos por IA" icon={Sparkles}>
            <LeadDatosExtraidos leadId={lead.id} />
          </Section>

          {/* Valoración del perito */}
          <Section title="Valoración económica" icon={Award}>
            <LeadValoracion leadId={lead.id} canEdit={isAdmin} />
          </Section>

          {/* Notas internas */}
          <Section title="Notas internas" icon={Pencil}>
            <InlineText
              label="Notas (solo visibles internamente)"
              value={lead.notas_abogado}
              onSave={(v) => updateField("notas_abogado", v)}
              multiline
              rows={5}
              placeholder="Anotaciones internas del despacho…"
            />
          </Section>

          {/* Historial */}
          <Section title="Historial de cambios" icon={History}>
            <LeadHistorial leadId={lead.id} reloadKey={historialKey} />
          </Section>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-5">
          {/* Estado del caso */}
          <Widget title="Estado del caso">
            <div className="space-y-2">
              {ESTADOS.map((e) => {
                const active = lead.estado === e;
                return (
                  <button
                    key={e}
                    onClick={() => updateEstado(e)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? estadoBadgeClass(e) + " ring-2 ring-offset-1 ring-accent/40"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{e}</span>
                    {active && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </Widget>

          {/* Próxima acción destacada */}
          {lead.siguiente_accion && (
            <Widget title="Próxima acción">
              <p className="text-sm font-semibold text-foreground">
                {labelSiguienteAccion(lead.siguiente_accion)}
              </p>
              {lead.accion_pendiente && (
                <p className="mt-1 text-xs text-muted-foreground">{lead.accion_pendiente}</p>
              )}
            </Widget>
          )}

          {/* Pago */}
          <Widget title="Pago Fase I">
            <PagoManualForm
              lead={lead}
              onSaved={(updated) => {
                setLead(updated);
                setHistorialKey((k) => k + 1);
              }}
            />
          </Widget>

          {/* Abogado asignado */}
          <Widget title="Abogado asignado">
            <AsignacionAbogado
              lead={lead}
              onSaved={(updated) => {
                setLead(updated);
                setHistorialKey((k) => k + 1);
              }}
            />
          </Widget>

          {/* Acciones rápidas */}
          <Widget title="Acciones rápidas">
            <div className="grid gap-2">
              <a
                href={`tel:${lead.telefono}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-light"
              >
                <Phone className="h-4 w-4" /> Llamar al cliente
              </a>
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <Mail className="h-4 w-4" /> Enviar email
              </a>
              {isAdmin && (
                <button
                  onClick={() => setEnviandoEmail(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/20"
                >
                  <Send className="h-4 w-4" /> Enviar al abogado
                </button>
              )}
              <button
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                title="Próximamente"
              >
                <Download className="h-4 w-4" /> Exportar a Google Sheets
              </button>
            </div>
          </Widget>
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

function Section({
  title,
  icon: Icon,
  children,
  tone,
  highlight,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  tone?: "danger";
  highlight?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? "border-destructive/50 bg-destructive/5"
      : highlight
        ? "border-accent/40 bg-accent-soft/20"
        : "border-border bg-card";
  return (
    <section className={`rounded-2xl border ${toneClass} p-5 shadow-card`}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
      {Icon && <Icon className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-foreground">{children}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <p className="font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold capitalize text-foreground">{value}</p>
    </div>
  );
}
