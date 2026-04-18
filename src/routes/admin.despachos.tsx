import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Building2,
  Users,
  MapPin,
  LogOut,
  Scale,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  listarDespachos,
  listarAbogados,
  listarMapeoProvincias,
  type Despacho,
  type AbogadoConDespacho,
  type ProvinciaAbogado,
} from "@/lib/abogados";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/despachos")({
  head: () => ({
    meta: [
      { title: "Panel · Despachos y abogados — Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DespachosPage,
});

type Tab = "despachos" | "abogados" | "provincias";

function DespachosPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("despachos");

  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [abogados, setAbogados] = useState<AbogadoConDespacho[]>([]);
  const [provincias, setProvincias] = useState<
    (ProvinciaAbogado & { abogados?: { nombre: string } | null })[]
  >([]);
  const [loading, setLoading] = useState(true);

  const reloadAll = async () => {
    setLoading(true);
    const [d, a, p] = await Promise.all([
      listarDespachos(),
      listarAbogados(),
      listarMapeoProvincias(),
    ]);
    setDespachos(d);
    setAbogados(a);
    setProvincias(p);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  useEffect(() => {
    if (session && isAdmin) reloadAll();
  }, [session, isAdmin]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!session) return null;

  if (!isAdmin) {
    return (
      <AdminLayout title="Despachos">
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-bold text-primary">Solo administradores</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            La gestión de despachos y abogados está reservada al rol admin.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Despachos y abogados"
      subtitle="Gestiona los despachos colaboradores, los abogados y la asignación por provincia."
    >
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1 shadow-card">
        <TabBtn active={tab === "despachos"} onClick={() => setTab("despachos")} icon={Building2}>
          Despachos ({despachos.length})
        </TabBtn>
        <TabBtn active={tab === "abogados"} onClick={() => setTab("abogados")} icon={Users}>
          Abogados ({abogados.length})
        </TabBtn>
        <TabBtn active={tab === "provincias"} onClick={() => setTab("provincias")} icon={MapPin}>
          Provincias ({provincias.length})
        </TabBtn>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : (
        <div className="mt-6">
          {tab === "despachos" && <DespachosTab despachos={despachos} onChange={reloadAll} />}
          {tab === "abogados" && (
            <AbogadosTab abogados={abogados} despachos={despachos} onChange={reloadAll} />
          )}
          {tab === "provincias" && (
            <ProvinciasTab mapeos={provincias} abogados={abogados} onChange={reloadAll} />
          )}
        </div>
      )}
    </AdminLayout>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

/* ========== DESPACHOS ========== */

function DespachosTab({
  despachos,
  onChange,
}: {
  despachos: Despacho[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<Despacho | "new" | null>(null);

  const remove = async (d: Despacho) => {
    if (!confirm(`¿Eliminar despacho "${d.nombre}"? Los abogados quedarán sin despacho.`))
      return;
    const { error } = await supabase.from("despachos").delete().eq("id", d.id);
    if (error) {
      toast.error("No se pudo eliminar: " + error.message);
      return;
    }
    toast.success("Despacho eliminado");
    onChange();
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light"
        >
          <Plus className="h-3.5 w-3.5" /> Nuevo despacho
        </button>
      </div>

      {despachos.length === 0 ? (
        <Empty
          icon={Building2}
          title="Aún no hay despachos"
          hint="Crea el primer despacho para empezar a registrar abogados."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {despachos.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <Building2 className="h-4 w-4 flex-none text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{d.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.ciudad ? `${d.ciudad} · ` : ""}
                  {d.email ?? "—"}
                  {d.telefono ? ` · ${d.telefono}` : ""}
                </p>
              </div>
              <button
                onClick={() => setEditing(d)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(d)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <DespachoModal
          despacho={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function DespachoModal({
  despacho,
  onClose,
  onSaved,
}: {
  despacho: Despacho | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nombre: despacho?.nombre ?? "",
    email: despacho?.email ?? "",
    telefono: despacho?.telefono ?? "",
    ciudad: despacho?.ciudad ?? "",
    notas: despacho?.notas ?? "",
    activo: despacho?.activo ?? true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      ciudad: form.ciudad.trim() || null,
      notas: form.notas.trim() || null,
      activo: form.activo,
    };
    const { error } = despacho
      ? await supabase.from("despachos").update(payload).eq("id", despacho.id)
      : await supabase.from("despachos").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Error: " + error.message);
      return;
    }
    toast.success(despacho ? "Despacho actualizado" : "Despacho creado");
    onSaved();
  };

  return (
    <ModalShell title={despacho ? "Editar despacho" : "Nuevo despacho"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre *" wide>
          <input
            className={inputCls}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Teléfono">
          <input
            className={inputCls}
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </Field>
        <Field label="Ciudad" wide>
          <input
            className={inputCls}
            value={form.ciudad}
            onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
          />
        </Field>
        <Field label="Notas internas" wide>
          <textarea
            rows={3}
            className={inputCls}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
        </Field>
        <Field label="Estado" wide>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary"
            />
            Activo
          </label>
        </Field>
      </div>
      <ModalFooter onClose={onClose} saving={saving} onSave={save} />
    </ModalShell>
  );
}

/* ========== ABOGADOS ========== */

function AbogadosTab({
  abogados,
  despachos,
  onChange,
}: {
  abogados: AbogadoConDespacho[];
  despachos: Despacho[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<AbogadoConDespacho | "new" | null>(null);

  const remove = async (a: AbogadoConDespacho) => {
    if (!confirm(`¿Eliminar abogado "${a.nombre}"?`)) return;
    const { error } = await supabase.from("abogados").delete().eq("id", a.id);
    if (error) {
      toast.error("No se pudo eliminar: " + error.message);
      return;
    }
    toast.success("Abogado eliminado");
    onChange();
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light"
        >
          <Plus className="h-3.5 w-3.5" /> Nuevo abogado
        </button>
      </div>

      {abogados.length === 0 ? (
        <Empty icon={Users} title="Aún no hay abogados" hint="Crea el primer abogado." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {abogados.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
              <Users className="h-4 w-4 flex-none text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-foreground">{a.nombre}</p>
                  {!a.activo && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {a.email}
                  {a.telefono ? ` · ${a.telefono}` : ""}
                  {a.despachos?.nombre ? ` · ${a.despachos.nombre}` : ""}
                  {!a.user_id && " · sin cuenta vinculada"}
                </p>
              </div>
              <button
                onClick={() => setEditing(a)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(a)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AbogadoModal
          abogado={editing === "new" ? null : editing}
          despachos={despachos}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function AbogadoModal({
  abogado,
  despachos,
  onClose,
  onSaved,
}: {
  abogado: AbogadoConDespacho | null;
  despachos: Despacho[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nombre: abogado?.nombre ?? "",
    email: abogado?.email ?? "",
    telefono: abogado?.telefono ?? "",
    despacho_id: abogado?.despacho_id ?? "",
    user_id: abogado?.user_id ?? "",
    activo: abogado?.activo ?? true,
    notas: abogado?.notas ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.nombre.trim() || !form.email.trim()) {
      toast.error("Nombre y email son obligatorios");
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim() || null,
      despacho_id: form.despacho_id || null,
      user_id: form.user_id.trim() || null,
      activo: form.activo,
      notas: form.notas.trim() || null,
    };
    const { error } = abogado
      ? await supabase.from("abogados").update(payload).eq("id", abogado.id)
      : await supabase.from("abogados").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Error: " + error.message);
      return;
    }
    toast.success(abogado ? "Abogado actualizado" : "Abogado creado");
    onSaved();
  };

  return (
    <ModalShell title={abogado ? "Editar abogado" : "Nuevo abogado"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre *">
          <input
            className={inputCls}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </Field>
        <Field label="Email *">
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Teléfono">
          <input
            className={inputCls}
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </Field>
        <Field label="Despacho">
          <select
            className={inputCls}
            value={form.despacho_id}
            onChange={(e) => setForm({ ...form, despacho_id: e.target.value })}
          >
            <option value="">— Sin despacho —</option>
            {despachos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="User ID (auth)" wide>
          <input
            className={inputCls}
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            placeholder="UUID de Supabase Auth (opcional, para que vea sus leads)"
          />
        </Field>
        <Field label="Notas" wide>
          <textarea
            rows={2}
            className={inputCls}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
        </Field>
        <Field label="Estado" wide>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary"
            />
            Activo (recibe asignaciones automáticas)
          </label>
        </Field>
      </div>
      <ModalFooter onClose={onClose} saving={saving} onSave={save} />
    </ModalShell>
  );
}

/* ========== PROVINCIAS ========== */

function ProvinciasTab({
  mapeos,
  abogados,
  onChange,
}: {
  mapeos: (ProvinciaAbogado & { abogados?: { nombre: string } | null })[];
  abogados: AbogadoConDespacho[];
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [provincia, setProvincia] = useState("");
  const [abogadoId, setAbogadoId] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!provincia.trim() || !abogadoId) {
      toast.error("Provincia y abogado son obligatorios");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("provincia_abogado")
      .insert({ provincia: provincia.trim(), abogado_id: abogadoId });
    setSaving(false);
    if (error) {
      toast.error("Error: " + error.message);
      return;
    }
    toast.success("Mapeo creado");
    setProvincia("");
    setAbogadoId("");
    setAdding(false);
    onChange();
  };

  const update = async (id: string, newAbogadoId: string) => {
    const { error } = await supabase
      .from("provincia_abogado")
      .update({ abogado_id: newAbogadoId })
      .eq("id", id);
    if (error) {
      toast.error("Error: " + error.message);
      return;
    }
    toast.success("Asignación actualizada");
    onChange();
  };

  const remove = async (id: string, prov: string) => {
    if (!confirm(`¿Quitar el mapeo de "${prov}"?`)) return;
    const { error } = await supabase.from("provincia_abogado").delete().eq("id", id);
    if (error) {
      toast.error("Error: " + error.message);
      return;
    }
    toast.success("Mapeo eliminado");
    onChange();
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva provincia
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border bg-card p-3">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Provincia
            </label>
            <input
              className={inputCls}
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              placeholder="Ej. Madrid"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Abogado por defecto
            </label>
            <select
              className={inputCls}
              value={abogadoId}
              onChange={(e) => setAbogadoId(e.target.value)}
            >
              <option value="">— Selecciona —</option>
              {abogados
                .filter((a) => a.activo)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={add}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar
          </button>
          <button
            onClick={() => setAdding(false)}
            className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      )}

      {mapeos.length === 0 ? (
        <Empty
          icon={MapPin}
          title="Sin asignaciones por provincia"
          hint="Mapea cada provincia al abogado que recibirá los nuevos leads automáticamente."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {mapeos.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <MapPin className="h-4 w-4 flex-none text-primary" />
              <span className="w-44 truncate font-semibold text-foreground">{m.provincia}</span>
              <select
                value={m.abogado_id}
                onChange={(e) => update(m.id, e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent"
              >
                {abogados.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                    {a.despachos?.nombre ? ` · ${a.despachos.nombre}` : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(m.id, m.provincia)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========== UI helpers ========== */

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

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

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-elegant"
      >
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({
  onClose,
  saving,
  onSave,
}: {
  onClose: () => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
      <button
        onClick={onClose}
        className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
      >
        Cancelar
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar
      </button>
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <Icon className="mx-auto h-10 w-10 text-muted-foreground/50" />
      <p className="mt-3 font-semibold text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
