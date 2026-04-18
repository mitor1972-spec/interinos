import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Save,
  Loader2,
  Scale,
  AlertCircle,
  CheckCircle2,
  Award,
  Pencil,
  Sparkles,
  History,
  Wand2,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { registrarCambios } from "@/lib/historial";
import { LeadEditModal } from "@/components/admin/LeadEditModal";
import { LeadHistorial } from "@/components/admin/LeadHistorial";
import { LeadDocumentos } from "@/components/admin/LeadDocumentos";
import { PagoManualForm } from "@/components/admin/PagoManualForm";
import { CompletitudBar } from "@/components/admin/CompletitudBar";
import { AsignacionAbogado } from "@/components/admin/AsignacionAbogado";

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
}

/** Genera el motivo de urgencia legible a partir de los datos del caso. */
function motivoUrgencia(lead: Lead): string {
  const sit = (lead.situacion_actual || "").toLowerCase();
  if (sit.includes("cesado") || sit.includes("cese")) {
    return "Cese reciente o inminente — requiere actuación inmediata";
  }
  if (lead.urgencia || sit.includes("plazo") || sit.includes("recurso")) {
    return "Plazo o recurso en marcha — tiempo crítico";
  }
  if (sit.includes("indefinido no fijo")) {
    return "Reconocido como indefinido no fijo — quiere reclamar más";
  }
  if (sit.includes("estabilización") || sit.includes("estabilizacion")) {
    return "Proceso de estabilización activo que afecta a la plaza";
  }
  return "Caso prioritario — revisar con el cliente";
}

export function LeadDrawer({ lead, onClose, onUpdated }: Props) {
  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState<EstadoCaso>("Nuevo");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [editing, setEditing] = useState(false);
  const [historialKey, setHistorialKey] = useState(0);
  const [documentosCount, setDocumentosCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);
  const lastNotasSaved = useRef<string>("");

  // Sync cuando cambia el lead seleccionado
  useEffect(() => {
    if (lead) {
      setNotas(lead.notas_abogado || "");
      setEstado(lead.estado);
      setSavedAt(null);
      initialMount.current = true;
      lastNotasSaved.current = lead.notas_abogado || "";
    }
  }, [lead?.id]);

  // Autosave de notas
  useEffect(() => {
    if (!lead) return;
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      const prev = lastNotasSaved.current;
      const { data, error } = await supabase
        .from("leads_interinos")
        .update({ notas_abogado: notas })
        .eq("id", lead.id)
        .select()
        .single();
      setSaving(false);
      if (error) {
        toast.error("No se pudieron guardar las notas");
        return;
      }
      if (data) {
        setSavedAt(new Date());
        onUpdated(data);
        // Historial: solo si cambió respecto al último guardado
        if ((prev || "") !== (notas || "")) {
          await registrarCambios(lead.id, [
            {
              campo: "notas_abogado",
              valor_anterior: prev || null,
              valor_nuevo: notas || null,
            },
          ]);
          lastNotasSaved.current = notas;
          setHistorialKey((k) => k + 1);
        }
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notas]);

  const updateEstado = async (nuevo: EstadoCaso) => {
    if (!lead || nuevo === lead.estado) return;
    const anterior = lead.estado;
    setEstado(nuevo);
    const { data, error } = await supabase
      .from("leads_interinos")
      .update({ estado: nuevo })
      .eq("id", lead.id)
      .select()
      .single();
    if (error) {
      toast.error("No se pudo actualizar el estado");
      return;
    }
    if (data) {
      toast.success(`Estado: ${nuevo}`);
      onUpdated(data);
      await registrarCambios(lead.id, [
        { campo: "estado", valor_anterior: anterior, valor_nuevo: nuevo },
      ]);
      setHistorialKey((k) => k + 1);
    }
  };

  const toggleUrgente = async () => {
    if (!lead) return;
    const nuevo = !lead.urgencia;
    const { data, error } = await supabase
      .from("leads_interinos")
      .update({
        urgencia: nuevo,
        resultado_viabilidad: nuevo
          ? lead.resultado_viabilidad === "inviable"
            ? "inviable"
            : "urgente"
          : lead.resultado_viabilidad === "urgente"
            ? "viable"
            : lead.resultado_viabilidad,
        semaforo: nuevo ? "rojo" : lead.semaforo,
      })
      .eq("id", lead.id)
      .select()
      .single();
    if (error) {
      toast.error("No se pudo actualizar la urgencia");
      return;
    }
    if (data) {
      toast.success(nuevo ? "Marcado como urgente" : "Urgencia retirada");
      onUpdated(data);
      await registrarCambios(lead.id, [
        {
          campo: "urgencia",
          valor_anterior: lead.urgencia ? "Sí" : "No",
          valor_nuevo: nuevo ? "Sí" : "No",
        },
      ]);
      setHistorialKey((k) => k + 1);
    }
  };

  const open = !!lead;

  return (
    <>
      <AnimatePresence>
        {open && lead && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-primary/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-background shadow-elegant"
            >
              <DrawerContent
                lead={lead}
                estado={estado}
                notas={notas}
                saving={saving}
                savedAt={savedAt}
                historialKey={historialKey}
                documentosCount={documentosCount}
                onClose={onClose}
                onChangeNotas={setNotas}
                onChangeEstado={updateEstado}
                onToggleUrgente={toggleUrgente}
                onEdit={() => setEditing(true)}
                onDocumentosChange={setDocumentosCount}
                onLeadUpdated={(updated) => {
                  onUpdated(updated);
                  setHistorialKey((k) => k + 1);
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {open && lead && editing && (
        <LeadEditModal
          lead={lead}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            onUpdated(updated);
            setHistorialKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}

function DrawerContent({
  lead,
  estado,
  notas,
  saving,
  savedAt,
  historialKey,
  documentosCount,
  onClose,
  onChangeNotas,
  onChangeEstado,
  onToggleUrgente,
  onEdit,
  onDocumentosChange,
  onLeadUpdated,
}: {
  lead: Lead;
  estado: EstadoCaso;
  notas: string;
  saving: boolean;
  savedAt: Date | null;
  historialKey: number;
  documentosCount: number;
  onClose: () => void;
  onChangeNotas: (v: string) => void;
  onChangeEstado: (v: EstadoCaso) => void;
  onToggleUrgente: () => void;
  onEdit: () => void;
  onDocumentosChange: (n: number) => void;
  onLeadUpdated: (lead: Lead) => void;
}) {
  const sem = semaforoConfig(lead.semaforo);
  const per = perfilConfig(lead.perfil);
  const reclamaciones = reclamacionesPorPerfil(lead.perfil);

  return (
    <>
      {/* header */}
      <header className="flex items-start justify-between gap-3 border-b border-border bg-card px-6 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${sem.className}`}
            >
              <span>{sem.emoji}</span> {sem.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${per.className}`}
            >
              <Scale className="h-3 w-3" />
              {per.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
              <Award className="h-3 w-3" />
              {lead.puntuacion_viabilidad} pts
            </span>
            {lead.urgencia && (
              <span className="inline-flex rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">
                Urgente
              </span>
            )}
          </div>
          <h2 className="mt-2 truncate text-xl font-bold text-primary">{lead.nombre}</h2>
          <p className="text-xs text-muted-foreground">{lead.tipo_relacion}</p>
          {(lead.urgencia || lead.semaforo === "rojo") && (
            <div className="mt-3 rounded-xl border-2 border-destructive/60 bg-destructive/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-xs font-bold uppercase tracking-wider text-destructive-foreground">
                  🔴 Caso urgente
                </span>
                <a
                  href={`tel:${lead.telefono}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
                >
                  <PhoneCall className="h-3.5 w-3.5" /> Llamar ahora →
                </a>
              </div>
              <p className="mt-2 text-sm font-semibold text-destructive">
                {motivoUrgencia(lead)}
              </p>
            </div>
          )}
          <CompletitudBar lead={lead} documentosCount={documentosCount} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
            aria-label="Editar caso"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar caso
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Contacto */}
        <Section title="Contacto">
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
        <Section title="Diagnóstico">
          {lead.diagnostico_titulo && (
            <p className="text-sm font-bold text-foreground">{lead.diagnostico_titulo}</p>
          )}
          {lead.diagnostico_mensaje && (
            <p className="mt-1 text-sm text-muted-foreground">{lead.diagnostico_mensaje}</p>
          )}
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-2">
              <p className="font-medium uppercase tracking-wider text-muted-foreground">Resultado</p>
              <p className="mt-0.5 font-semibold capitalize text-foreground">
                {lead.resultado_viabilidad}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <p className="font-medium uppercase tracking-wider text-muted-foreground">Perfil</p>
              <p className="mt-0.5 font-semibold capitalize text-foreground">{lead.perfil}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <p className="font-medium uppercase tracking-wider text-muted-foreground">
                Puntuación
              </p>
              <p className="mt-0.5 font-semibold text-foreground">
                {lead.puntuacion_viabilidad} / 13
              </p>
            </div>
          </div>
        </Section>

        {/* Qué puede reclamar */}
        {lead.resultado_viabilidad !== "inviable" && (
          <Section title="Qué podría reclamar">
            <ul className="space-y-1.5 text-sm text-foreground/85">
              {reclamaciones.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Caso */}
        <Section title="Detalles del caso">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Item label="Administración" value={lead.administracion} />
            <Item
              label="Antigüedad"
              value={`${lead.anos_servicio} ${lead.anos_servicio === 1 ? "año" : "años"}`}
            />
            <Item label="Situación actual" value={lead.situacion_actual} />
            <Item
              label="Contratos sucesivos"
              value={lead.contratos_sucesivos ? "Sí" : "No"}
            />
            <Item label="Urgencia" value={lead.urgencia ? "Sí — plazo o recurso" : "No"} />
            <Item
              label="Pago Fase I"
              value={lead.pago_completado ? "Completado" : "Pendiente"}
            />
          </dl>
        </Section>

        {/* Pago */}
        <Section title="Pago Fase I">
          <PagoManualForm lead={lead} onSaved={onLeadUpdated} />
        </Section>

        {/* Documentos subidos por el abogado */}
        <Section title="Documentos del caso (abogado)">
          <LeadDocumentos leadId={lead.id} onChange={onDocumentosChange} />
        </Section>

        {/* Documentación */}
        <Section title="Documentación marcada por el cliente">
          {lead.documentos_disponibles && lead.documentos_disponibles.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {lead.documentos_disponibles.map((d) => (
                <li
                  key={d}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                >
                  <FileText className="h-3 w-3" />
                  {d}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin documentación marcada.</p>
          )}
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            La subida real de archivos por el cliente se habilitará tras la activación del pago.
          </p>
        </Section>

        {/* Mensaje libre */}
        {lead.mensaje_libre && (
          <Section title="Mensaje del cliente">
            <p className="whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-sm text-foreground">
              {lead.mensaje_libre}
            </p>
          </Section>
        )}

        {/* Estado */}
        <Section title="Estado del caso">
          <div className="flex flex-wrap items-center gap-2">
            {ESTADOS.map((e) => {
              const active = estado === e;
              return (
                <button
                  key={e}
                  onClick={() => onChangeEstado(e)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? estadoBadgeClass(e)
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Notas */}
        <Section
          title="Notas internas"
          right={
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Guardando...
                </>
              ) : savedAt ? (
                <>
                  <Save className="h-3 w-3 text-success" /> Guardado
                </>
              ) : (
                "Autoguardado activo"
              )}
            </span>
          }
        >
          <textarea
            value={notas}
            onChange={(e) => onChangeNotas(e.target.value)}
            rows={6}
            placeholder="Anotaciones del abogado, próximos pasos, observaciones..."
            className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </Section>

        {/* Gestión IA — placeholders */}
        <section className="mb-5 rounded-2xl border border-primary/30 bg-primary/10 p-4 ring-1 ring-primary/10">
          <div className="mb-3 flex items-center justify-between border-b border-primary/20 pb-2">
            <h3 className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Gestión IA
            </h3>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Beta
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <IAButton icon={Wand2} label="Generar demanda con IA" />
            <IAButton icon={Sparkles} label="Ayuda IA sobre este caso" />
          </div>
          <p className="mt-2 text-[11px] italic text-primary/70">
            Estas herramientas estarán disponibles próximamente.
          </p>
        </section>

        {/* Historial de cambios */}
        <Section
          title="Historial de cambios"
          right={
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <History className="h-3 w-3" /> Auditoría
            </span>
          }
        >
          <LeadHistorial leadId={lead.id} reloadKey={historialKey} />
        </Section>
      </div>

      {/* footer acciones */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-6 py-3">
        <button
          onClick={onToggleUrgente}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-bold transition ${
            lead.urgencia
              ? "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "border border-border bg-background text-foreground hover:bg-muted"
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {lead.urgencia ? "Quitar urgente" : "Marcar urgente"}
        </button>
        <a
          href={`tel:${lead.telefono}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-light"
        >
          <Phone className="h-4 w-4" /> Llamar
        </a>
        <a
          href={`mailto:${lead.email}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-primary bg-background px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Mail className="h-4 w-4" /> Email
        </a>
      </footer>
    </>
  );
}

function IAButton({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled
      className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-background/80 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-background disabled:cursor-not-allowed"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        {label}
      </span>
      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
        Próximamente
      </span>
    </button>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-2xl border border-border bg-muted/40 p-4">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
