import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, MapPin, Calendar, FileText, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ESTADOS,
  semaforoConfig,
  estadoBadgeClass,
  formatDate,
  type Lead,
  type EstadoCaso,
} from "@/lib/leads";

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
}

export function LeadDrawer({ lead, onClose, onUpdated }: Props) {
  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState<EstadoCaso>("Nuevo");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  // Sync cuando cambia el lead seleccionado
  useEffect(() => {
    if (lead) {
      setNotas(lead.notas_abogado || "");
      setEstado(lead.estado);
      setSavedAt(null);
      initialMount.current = true;
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
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notas]);

  const updateEstado = async (nuevo: EstadoCaso) => {
    if (!lead) return;
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
    }
  };

  const open = !!lead;

  return (
    <AnimatePresence>
      {open && lead && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-primary/40 backdrop-blur-sm"
          />
          {/* drawer */}
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
              onClose={onClose}
              onChangeNotas={setNotas}
              onChangeEstado={updateEstado}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerContent({
  lead,
  estado,
  notas,
  saving,
  savedAt,
  onClose,
  onChangeNotas,
  onChangeEstado,
}: {
  lead: Lead;
  estado: EstadoCaso;
  notas: string;
  saving: boolean;
  savedAt: Date | null;
  onClose: () => void;
  onChangeNotas: (v: string) => void;
  onChangeEstado: (v: EstadoCaso) => void;
}) {
  const sem = semaforoConfig(lead.semaforo);

  return (
    <>
      {/* header */}
      <header className="flex items-start justify-between gap-3 border-b border-border bg-card px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${sem.className}`}
            >
              <span>{sem.emoji}</span> {sem.label}
            </span>
            {lead.urgencia && (
              <span className="inline-flex rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">
                Urgente
              </span>
            )}
          </div>
          <h2 className="mt-2 truncate text-xl font-bold text-primary">{lead.nombre}</h2>
          <p className="text-xs text-muted-foreground">{lead.tipo_relacion}</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
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
        </Section>

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
            <Item label="Pago Fase I" value={lead.pago_completado ? "Completado" : "Pendiente"} />
          </dl>
        </Section>

        {/* Documentación */}
        <Section title="Documentación disponible">
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
        </Section>

        {/* Mensaje libre */}
        {lead.mensaje_libre && (
          <Section title="Mensaje del cliente">
            <p className="whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground">
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
      </div>

      {/* footer acciones */}
      <footer className="flex items-center gap-2 border-t border-border bg-card px-6 py-3">
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
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
