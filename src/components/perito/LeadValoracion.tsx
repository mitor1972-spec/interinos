import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Send, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatEuros } from "@/lib/leads";
import {
  calcularTotal,
  crearValoracion,
  eliminarValoracion,
  estadoValoracionConfig,
  guardarValoracion,
  listarValoraciones,
  type Valoracion,
} from "@/lib/valoraciones";

interface Props {
  leadId: string;
  /** true = puede editar (perito asignado o admin), false = solo lectura */
  canEdit: boolean;
}

const CAMPOS: { key: keyof Valoracion; label: string; help?: string }[] = [
  { key: "indemnizacion_principal", label: "Indemnización principal", help: "33 días/año o equivalente" },
  { key: "salarios_tramitacion", label: "Salarios de tramitación" },
  { key: "antiguedad_reconocida", label: "Antigüedad reconocida" },
  { key: "danos_perjuicios", label: "Daños y perjuicios" },
  { key: "intereses", label: "Intereses" },
  { key: "costas", label: "Costas" },
];

export function LeadValoracion({ leadId, canEdit }: Props) {
  const { session } = useAuth();
  const [items, setItems] = useState<Valoracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Partial<Valoracion>>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await listarValoraciones(leadId);
      setItems(data);
      const next: Record<string, Partial<Valoracion>> = {};
      data.forEach((v) => (next[v.id] = v));
      setDraft(next);
    } catch (e) {
      toast.error("Error cargando valoraciones: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const handleNueva = async () => {
    if (!session) return;
    try {
      const nueva = await crearValoracion(leadId, session.user.id, session.user.email ?? null);
      setItems((p) => [nueva, ...p]);
      setDraft((p) => ({ ...p, [nueva.id]: nueva }));
      toast.success("Nueva valoración creada");
    } catch (e) {
      toast.error("No se pudo crear: " + (e as Error).message);
    }
  };

  const handleSave = async (id: string, nuevoEstado?: Valoracion["estado"]) => {
    setSaving(id);
    try {
      const patch = { ...draft[id], ...(nuevoEstado ? { estado: nuevoEstado } : {}) };
      const updated = await guardarValoracion(id, patch);
      setItems((p) => p.map((v) => (v.id === id ? updated : v)));
      setDraft((p) => ({ ...p, [id]: updated }));
      toast.success(nuevoEstado === "enviada" ? "Valoración enviada" : "Guardado");
    } catch (e) {
      toast.error("Error guardando: " + (e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este borrador?")) return;
    try {
      await eliminarValoracion(id);
      setItems((p) => p.filter((v) => v.id !== id));
    } catch (e) {
      toast.error("No se pudo eliminar: " + (e as Error).message);
    }
  };

  const updateField = (id: string, key: keyof Valoracion, value: string) => {
    setDraft((p) => ({
      ...p,
      [id]: { ...p[id], [key]: value === "" ? 0 : Number(value) },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando valoraciones...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
            <Calculator className="h-4 w-4 text-accent" />
            Valoración económica
          </h3>
          <p className="text-xs text-muted-foreground">
            {items.length === 0
              ? "Sin valoraciones todavía."
              : `${items.length} valoración(es) registrada(s).`}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={handleNueva}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-light"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva valoración
          </button>
        )}
      </div>

      {items.length === 0 && !canEdit && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
          No hay valoración del perito todavía.
        </div>
      )}

      {items.map((v) => {
        const d = draft[v.id] ?? v;
        const total = calcularTotal(d);
        const cfg = estadoValoracionConfig(v.estado);
        const editable = canEdit && (v.estado === "borrador" || v.estado === "rechazada");
        return (
          <div key={v.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.className}`}
              >
                {cfg.label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(v.fecha_valoracion).toLocaleString("es-ES")}
                {v.perito_email ? ` · ${v.perito_email}` : ""}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {CAMPOS.map((c) => (
                <label key={c.key as string} className="block">
                  <span className="text-xs font-semibold text-foreground">{c.label}</span>
                  {c.help && (
                    <span className="ml-1 text-[10px] text-muted-foreground">({c.help})</span>
                  )}
                  <div className="mt-1 flex items-center rounded-lg border border-border bg-background focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      readOnly={!editable}
                      value={(d[c.key] as number) ?? 0}
                      onChange={(e) => updateField(v.id, c.key, e.target.value)}
                      className="w-full rounded-l-lg bg-transparent px-3 py-2 text-sm outline-none"
                    />
                    <span className="px-3 text-xs text-muted-foreground">€</span>
                  </div>
                </label>
              ))}

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-foreground">Otros conceptos</span>
                <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                  <input
                    type="text"
                    readOnly={!editable}
                    value={(d.otros_concepto as string) ?? ""}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        [v.id]: { ...p[v.id], otros_concepto: e.target.value },
                      }))
                    }
                    placeholder="Descripción libre"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                  <div className="flex items-center rounded-lg border border-border bg-background focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      readOnly={!editable}
                      value={(d.otros_importe as number) ?? 0}
                      onChange={(e) => updateField(v.id, "otros_importe", e.target.value)}
                      className="w-32 bg-transparent px-3 py-2 text-sm outline-none"
                    />
                    <span className="px-3 text-xs text-muted-foreground">€</span>
                  </div>
                </div>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-foreground">Notas</span>
                <textarea
                  readOnly={!editable}
                  rows={2}
                  value={(d.notas as string) ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      [v.id]: { ...p[v.id], notas: e.target.value },
                    }))
                  }
                  placeholder="Observaciones, criterio de cálculo..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total reclamación
                </span>
                <div className="text-xl font-bold text-primary">{formatEuros(total)}</div>
              </div>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  {v.estado === "borrador" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      disabled={saving === v.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  )}
                  {editable && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSave(v.id)}
                        disabled={saving === v.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        {saving === v.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave(v.id, "enviada")}
                        disabled={saving === v.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" /> Enviar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
