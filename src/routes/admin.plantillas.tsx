import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, FileType2, ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import {
  listarPlantillas,
  crearPlantilla,
  actualizarPlantilla,
  eliminarPlantilla,
  asegurarPlantillaBase,
  interpolarPlantilla,
  PLANTILLA_TIPOS,
  PLANTILLA_BASE_HTML,
  VARIABLES_CANONICAS,
  type Plantilla,
  type PlantillaTipo,
} from "@/lib/plantillas";

export const Route = createFileRoute("/admin/plantillas")({
  head: () => ({
    meta: [
      { title: "Plantillas de reclamación · Hispajuris" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPlantillas,
});

function AdminPlantillas() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Plantilla[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [editing, setEditing] = useState<Plantilla | null>(null);
  const [creating, setCreating] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<"" | PlantillaTipo>("");

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [loading, isAdmin, navigate]);

  async function recargar() {
    setLoadingList(true);
    await asegurarPlantillaBase();
    const data = await listarPlantillas();
    setItems(data);
    setLoadingList(false);
  }

  useEffect(() => {
    void recargar();
  }, []);

  const itemsFiltrados = useMemo(
    () => (filtroTipo ? items.filter((p) => p.tipo === filtroTipo) : items),
    [items, filtroTipo],
  );

  async function toggleActiva(p: Plantilla) {
    const r = await actualizarPlantilla(p.id, { activa: !p.activa });
    if (!r.ok) return toast.error(r.error ?? "No se pudo actualizar");
    toast.success(p.activa ? "Plantilla desactivada" : "Plantilla activada");
    void recargar();
  }

  async function eliminar(p: Plantilla) {
    if (!confirm(`¿Eliminar la plantilla "${p.nombre}"?`)) return;
    const r = await eliminarPlantilla(p.id);
    if (!r.ok) return toast.error(r.error ?? "No se pudo eliminar");
    toast.success("Plantilla eliminada");
    void recargar();
  }

  return (
    <AdminLayout title="Plantillas de reclamación">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <button
          onClick={() => navigate({ to: "/admin" })}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <FileType2 className="h-6 w-6 text-primary" /> Plantillas de reclamación
            </h1>
            <p className="text-sm text-muted-foreground">
              Define modelos de demanda, recursos y escritos con variables tipo{" "}
              <code className="rounded bg-muted px-1.5">{`{{cliente_nombre}}`}</code>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as "" | PlantillaTipo)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="">Todos los tipos</option>
              {PLANTILLA_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-light"
            >
              <Plus className="h-4 w-4" /> Nueva plantilla
            </button>
          </div>
        </div>

        {loadingList ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : itemsFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "No hay plantillas. Crea la primera para que los abogados puedan generar escritos."
                : "Ninguna plantilla con ese filtro."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {itemsFiltrados.map((p) => {
              const tipoLabel = PLANTILLA_TIPOS.find((t) => t.value === p.tipo)?.label ?? p.tipo;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">{p.nombre}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {tipoLabel}
                      </span>
                      {!p.activa && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          Inactiva
                        </span>
                      )}
                    </div>
                    {p.descripcion && (
                      <p className="mt-1 text-xs text-muted-foreground">{p.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActiva(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                      title={p.activa ? "Desactivar" : "Activar"}
                    >
                      {p.activa ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => setEditing(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => eliminar(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(editing || creating) && (
        <PlantillaModal
          plantilla={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            void recargar();
          }}
        />
      )}
    </AdminLayout>
  );
}

function PlantillaModal({
  plantilla,
  onClose,
  onSaved,
}: {
  plantilla: Plantilla | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? "");
  const [tipo, setTipo] = useState<PlantillaTipo>(plantilla?.tipo ?? "demanda");
  const [contenido, setContenido] = useState(plantilla?.contenido_html ?? PLANTILLA_BASE_HTML);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return toast.error("El nombre es obligatorio");
    if (!contenido.trim()) return toast.error("El contenido no puede estar vacío");
    setSaving(true);
    const r = plantilla
      ? await actualizarPlantilla(plantilla.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          tipo,
          contenido_html: contenido,
        })
      : await crearPlantilla({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          tipo,
          contenido_html: contenido,
        });
    setSaving(false);
    if (!r.ok) return toast.error(r.error ?? "No se pudo guardar");
    toast.success(plantilla ? "Plantilla actualizada" : "Plantilla creada");
    onSaved();
  }

  function insertarVariable(key: string) {
    setContenido((c) => `${c}{{${key}}}`);
  }

  // Agrupar variables por grupo para el panel lateral
  const variablesPorGrupo = useMemo(() => {
    const m = new Map<string, typeof VARIABLES_CANONICAS>();
    for (const v of VARIABLES_CANONICAS) {
      if (!m.has(v.grupo)) m.set(v.grupo, []);
      m.get(v.grupo)!.push(v);
    }
    return Array.from(m.entries());
  }, []);

  const previewHtml = useMemo(() => interpolarPlantilla(contenido), [contenido]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{plantilla ? "Editar plantilla" : "Nueva plantilla"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Nombre</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Reclamación administrativa — Funcionario interino"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Tipo</span>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as PlantillaTipo)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {PLANTILLA_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Descripción</span>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Cuándo usarla"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Contenido (admite {`{{variables}}`})
              </span>
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                rows={20}
                className="mt-1 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs"
              />
            </label>
          </div>

          <aside className="rounded-xl border border-border bg-muted/30 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              Variables disponibles
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Click para insertar al final del contenido.
            </p>
            <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
              {variablesPorGrupo.map(([grupo, vars]) => (
                <div key={grupo}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {grupo}
                  </p>
                  <div className="space-y-1">
                    {vars.map((v) => (
                      <button
                        key={v.key}
                        onClick={() => insertarVariable(v.key)}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-left text-xs hover:border-primary"
                      >
                        <code className="text-primary">{`{{${v.key}}}`}</code>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{v.descripcion}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <Eye className="h-4 w-4" /> Vista previa
          </button>
          <button
            onClick={guardar}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Vista previa con datos demo</h3>
              <button onClick={() => setPreviewOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Esta vista usa datos ficticios (caso “María García Demo”) para comprobar el aspecto de la plantilla.
            </p>
            <div
              className="prose max-w-none rounded-xl border border-border bg-background p-6 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            <div className="mt-4 text-right">
              <button
                onClick={() => setPreviewOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
