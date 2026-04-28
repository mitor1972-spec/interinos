import { useEffect, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ESTADOS,
  PERFILES,
  type Lead,
  type EstadoCaso,
  type Perfil,
} from "@/lib/leads";
import { diffLeads, registrarCambios } from "@/lib/historial";

interface Props {
  lead: Lead;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
}

/**
 * Modal de edición completa del caso. Detecta cambios y los registra en
 * lead_historial automáticamente.
 */
export function LeadEditModal({ lead, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    nombre: lead.nombre,
    email: lead.email,
    telefono: lead.telefono,
    provincia: lead.provincia,
    tipo_relacion: lead.tipo_relacion,
    administracion: lead.administracion,
    anos_servicio: lead.anos_servicio,
    situacion_actual: lead.situacion_actual,
    perfil: lead.perfil as Perfil,
    estado: lead.estado as EstadoCaso,
    urgencia: lead.urgencia,
    notas_abogado: lead.notas_abogado ?? "",
  });
  const [saving, setSaving] = useState(false);

  // Bloquea scroll del body mientras el modal está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const patch: Partial<Lead> = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      provincia: form.provincia.trim(),
      tipo_relacion: form.tipo_relacion.trim(),
      administracion: form.administracion.trim(),
      anos_servicio: Number(form.anos_servicio) || 0,
      situacion_actual: form.situacion_actual.trim(),
      perfil: form.perfil,
      estado: form.estado,
      urgencia: form.urgencia,
      notas_abogado: form.notas_abogado.trim() || null,
    };

    const { data, error } = await supabase
      .from("leads_interinos")
      .update(patch)
      .eq("id", lead.id)
      .select()
      .single();

    if (error || !data) {
      setSaving(false);
      toast.error("No se pudo guardar el caso: " + (error?.message ?? ""));
      return;
    }

    // Registra historial de los campos auditables
    const cambios = diffLeads(lead, data, [
      "nombre",
      "email",
      "telefono",
      "provincia",
      "tipo_relacion",
      "administracion",
      "anos_servicio",
      "situacion_actual",
      "perfil",
      "estado",
      "urgencia",
      "notas_abogado",
    ]);
    await registrarCambios(lead.id, cambios);

    setSaving(false);
    toast.success("Caso actualizado");
    onSaved(data);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-elegant animate-in zoom-in-95 duration-200"
      >
          <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-primary">Editar caso</h2>
              <p className="text-xs text-muted-foreground">
                Cambios registrados automáticamente en el historial.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <Group title="Datos de contacto">
              <Field label="Nombre">
                <input
                  className={inputCls}
                  value={form.nombre}
                  onChange={(e) => update("nombre", e.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
              <Field label="Teléfono">
                <input
                  className={inputCls}
                  value={form.telefono}
                  onChange={(e) => update("telefono", e.target.value)}
                />
              </Field>
              <Field label="Provincia">
                <input
                  className={inputCls}
                  value={form.provincia}
                  onChange={(e) => update("provincia", e.target.value)}
                />
              </Field>
            </Group>

            <Group title="Detalles del caso">
              <Field label="Tipo de relación">
                <input
                  className={inputCls}
                  value={form.tipo_relacion}
                  onChange={(e) => update("tipo_relacion", e.target.value)}
                />
              </Field>
              <Field label="Administración">
                <input
                  className={inputCls}
                  value={form.administracion}
                  onChange={(e) => update("administracion", e.target.value)}
                />
              </Field>
              <Field label="Años de servicio">
                <input
                  type="number"
                  min={0}
                  max={60}
                  className={inputCls}
                  value={form.anos_servicio}
                  onChange={(e) => update("anos_servicio", Number(e.target.value))}
                />
              </Field>
              <Field label="Perfil">
                <select
                  className={inputCls}
                  value={form.perfil}
                  onChange={(e) => update("perfil", e.target.value as Perfil)}
                >
                  {PERFILES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Situación actual" wide>
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.situacion_actual}
                  onChange={(e) => update("situacion_actual", e.target.value)}
                />
              </Field>
            </Group>

            <Group title="Gestión">
              <Field label="Estado del caso">
                <select
                  className={inputCls}
                  value={form.estado}
                  onChange={(e) => update("estado", e.target.value as EstadoCaso)}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Urgencia">
                <label className="mt-1 inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.urgencia}
                    onChange={(e) => update("urgencia", e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-accent"
                  />
                  Marcar como caso urgente
                </label>
              </Field>
              <Field label="Notas internas" wide>
                <textarea
                  rows={4}
                  className={inputCls}
                  value={form.notas_abogado}
                  onChange={(e) => update("notas_abogado", e.target.value)}
                  placeholder="Notas privadas para el equipo..."
                />
              </Field>
            </Group>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar cambios
            </button>
          </footer>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
