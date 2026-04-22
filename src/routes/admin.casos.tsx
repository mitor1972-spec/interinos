import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Search,
  Download,
  Inbox,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileCheck2,
  CreditCard,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ESTADOS,
  SEMAFOROS,
  PERFILES,
  semaforoConfig,
  perfilConfig,
  estadoBadgeClass,
  formatDateShort,
  exportLeadsToCSV,
  docsCompletos,
  type Lead,
  type Semaforo,
  type EstadoCaso,
  type Perfil,
} from "@/lib/leads";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { RowMenu } from "@/components/admin/RowMenu";
import { AdminLayout } from "@/components/admin/AdminLayout";

type SortKey =
  | "created_at"
  | "nombre"
  | "provincia"
  | "perfil"
  | "anos_servicio"
  | "puntuacion_viabilidad"
  | "semaforo"
  | "estado";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export const Route = createFileRoute("/admin/casos")({
  head: () => ({
    meta: [
      { title: "Casos · Hispajuris · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCasos,
});

function AdminCasos() {
  const { session, isLawyer, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSem, setFilterSem] = useState<Semaforo | "todos">("todos");
  const [filterEstado, setFilterEstado] = useState<EstadoCaso | "todos">("todos");
  const [filterPerfil, setFilterPerfil] = useState<Perfil | "todos">("todos");
  const [filterPago, setFilterPago] = useState<"todos" | "si" | "no">("todos");
  const [filterRevisado, setFilterRevisado] = useState<"todos" | "si" | "no">("todos");
  const [, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "created_at", dir: "desc" });

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads_interinos")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Error cargando leads: " + error.message);
      return;
    }
    setLeads(data || []);
  };

  useEffect(() => {
    if (session && isLawyer) fetchLeads();
  }, [session, isLawyer]);

  const openLead = async (lead: Lead) => {
    setSelectedId(lead.id);
    if (!lead.revisado) {
      // marcado optimista; la página completa también lo intenta
      void supabase
        .from("leads_interinos")
        .update({ revisado: true, revisado_at: new Date().toISOString() })
        .eq("id", lead.id);
    }
    navigate({ to: "/admin/casos/$id", params: { id: lead.id } });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = leads.filter((l) => {
      if (filterSem !== "todos" && l.semaforo !== filterSem) return false;
      if (filterEstado !== "todos" && l.estado !== filterEstado) return false;
      if (filterPerfil !== "todos" && l.perfil !== filterPerfil) return false;
      if (filterPago === "si" && !l.pago_completado) return false;
      if (filterPago === "no" && l.pago_completado) return false;
      if (filterRevisado === "si" && !l.revisado) return false;
      if (filterRevisado === "no" && l.revisado) return false;
      if (q) {
        const blob =
          `${l.nombre} ${l.email} ${l.telefono} ${l.provincia} ${l.administracion}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    const semafOrder: Record<Semaforo, number> = { rojo: 0, ambar: 1, verde: 2 };
    const estadoOrder: Record<EstadoCaso, number> = {
      Nuevo: 0,
      "En estudio": 1,
      "Propuesta enviada": 2,
      Cliente: 3,
      Descartado: 4,
    };
    const dir = sort.dir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      const k = sort.key;
      let av: number | string;
      let bv: number | string;
      if (k === "created_at") {
        av = new Date(a.created_at).getTime();
        bv = new Date(b.created_at).getTime();
      } else if (k === "anos_servicio" || k === "puntuacion_viabilidad") {
        av = a[k];
        bv = b[k];
      } else if (k === "semaforo") {
        av = semafOrder[a.semaforo];
        bv = semafOrder[b.semaforo];
      } else if (k === "estado") {
        av = estadoOrder[a.estado];
        bv = estadoOrder[b.estado];
      } else {
        av = String(a[k] ?? "").toLowerCase();
        bv = String(b[k] ?? "").toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return sorted;
  }, [leads, search, filterSem, filterEstado, filterPerfil, filterPago, filterRevisado, sort]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));
  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((l) => next.delete(l.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((l) => next.add(l.id));
      return next;
    });

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "created_at" || key === "puntuacion_viabilidad" ? "desc" : "asc" },
    );

  const updateOne = async (id: string, patch: Partial<Lead>, successMsg?: string) => {
    const { data, error } = await supabase
      .from("leads_interinos")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    if (data) {
      setLeads((prev) => prev.map((l) => (l.id === data.id ? data : l)));
      if (successMsg) toast.success(successMsg);
    }
  };

  const deleteOne = async (id: string) => {
    if (!confirm("¿Eliminar este caso? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("leads_interinos").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success("Caso eliminado");
  };

  const bulkChangeEstado = async (estado: EstadoCaso) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    const { data, error } = await supabase
      .from("leads_interinos")
      .update({ estado })
      .in("id", ids)
      .select();
    setBulkBusy(false);
    if (error) {
      toast.error("No se pudo cambiar el estado");
      return;
    }
    if (data) {
      const map = new Map(data.map((l) => [l.id, l]));
      setLeads((prev) => prev.map((l) => map.get(l.id) ?? l));
      toast.success(`${data.length} actualizados a "${estado}"`);
    }
  };

  const bulkMarkUrgente = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    const { data, error } = await supabase
      .from("leads_interinos")
      .update({ urgencia: true, semaforo: "rojo" })
      .in("id", ids)
      .select();
    setBulkBusy(false);
    if (error) {
      toast.error("No se pudo marcar como urgente");
      return;
    }
    if (data) {
      const map = new Map(data.map((l) => [l.id, l]));
      setLeads((prev) => prev.map((l) => map.get(l.id) ?? l));
      toast.success(`${data.length} marcados como urgentes`);
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `¿Eliminar ${ids.length} caso${ids.length === 1 ? "" : "s"}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setBulkBusy(true);
    const { error } = await supabase.from("leads_interinos").delete().in("id", ids);
    setBulkBusy(false);
    if (error) {
      toast.error("No se pudieron eliminar");
      return;
    }
    setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
    setSelectedIds(new Set());
    toast.success(`${ids.length} casos eliminados`);
  };

  if (authLoading) {
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

  const headerActions = (
    <>
      <button
        onClick={fetchLeads}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Refrescar</span>
      </button>
      <button
        onClick={() => exportLeadsToCSV(filtered)}
        disabled={filtered.length === 0}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        CSV ({filtered.length})
      </button>
    </>
  );

  return (
    <AdminLayout
      title="Casos"
      subtitle={`${filtered.length} de ${leads.length} casos · busca, filtra, ordena y edita.`}
      actions={headerActions}
    >
      {/* Filtros */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email, teléfono, provincia o administración..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <select
            value={filterSem}
            onChange={(e) => setFilterSem(e.target.value as Semaforo | "todos")}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="todos">Todos los semáforos</option>
            {SEMAFOROS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.emoji} {s.label}
              </option>
            ))}
          </select>

          <select
            value={filterPerfil}
            onChange={(e) => setFilterPerfil(e.target.value as Perfil | "todos")}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="todos">Todos los perfiles</option>
            {PERFILES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as EstadoCaso | "todos")}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <select
            value={filterPago}
            onChange={(e) => setFilterPago(e.target.value as "todos" | "si" | "no")}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="todos">Pago: todos</option>
            <option value="si">Pago: sí</option>
            <option value="no">Pago: no</option>
          </select>

          <select
            value={filterRevisado}
            onChange={(e) => setFilterRevisado(e.target.value as "todos" | "si" | "no")}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="todos">Revisado: todos</option>
            <option value="no">Sin revisar</option>
            <option value="si">Revisados</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando casos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {leads.length === 0
                ? "Aún no hay casos. Cuando alguien complete el diagnóstico aparecerá aquí."
                : "Ningún caso coincide con los filtros."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todos los visibles"
                      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </th>
                  <SortableTh label="Fecha" k="created_at" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Nombre" k="nombre" sort={sort} onSort={toggleSort} />
                  <th className="px-4 py-3">Contacto</th>
                  <SortableTh label="Provincia" k="provincia" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Perfil" k="perfil" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Años" k="anos_servicio" sort={sort} onSort={toggleSort} />
                  <SortableTh
                    label="Pts."
                    k="puntuacion_viabilidad"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableTh label="Semáforo" k="semaforo" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Estado" k="estado" sort={sort} onSort={toggleSort} />
                  <th className="px-4 py-3 text-center" title="Documentación completa">
                    Docs
                  </th>
                  <th className="px-4 py-3 text-center" title="Pago Fase I cobrado">
                    Pago
                  </th>
                  <th className="w-12 px-2 py-3 text-center" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const sem = semaforoConfig(l.semaforo);
                  const per = perfilConfig(l.perfil);
                  const docs = docsCompletos(l.documentos_disponibles);
                  const isSelected = selectedIds.has(l.id);
                  return (
                    <tr
                      key={l.id}
                      onClick={() => openLead(l)}
                      className={`cursor-pointer border-b border-border last:border-0 transition hover:bg-accent-soft/30 ${
                        isSelected ? "bg-accent/10" : !l.revisado ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(l.id)}
                          aria-label={`Seleccionar ${l.nombre}`}
                          className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {!l.revisado && (
                            <span
                              className="h-2 w-2 flex-none rounded-full bg-destructive"
                              aria-label="Sin revisar"
                              title="Sin revisar"
                            />
                          )}
                          {formatDateShort(l.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{l.nombre}</div>
                        <div className="text-xs text-muted-foreground">{l.tipo_relacion}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-foreground">{l.email}</div>
                        <div className="text-muted-foreground">{l.telefono}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{l.provincia}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${per.className}`}
                        >
                          {per.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {l.anos_servicio}
                      </td>
                      <td className="px-4 py-3 text-foreground">{l.puntuacion_viabilidad}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${sem.className}`}
                        >
                          <span>{sem.emoji}</span> {sem.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoBadgeClass(l.estado)}`}
                        >
                          {l.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {docs ? (
                          <span title="Documentación completa">
                            <FileCheck2 className="mx-auto h-4 w-4 text-success" />
                          </span>
                        ) : (
                          <span
                            className="text-muted-foreground"
                            title="Documentación incompleta o pendiente"
                          >
                            ⏳
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {l.pago_completado ? (
                          <span title="Pago Fase I cobrado">
                            <CreditCard className="mx-auto h-4 w-4 text-success" />
                          </span>
                        ) : (
                          <span className="text-muted-foreground" title="Sin pago">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <RowMenu
                          isUrgente={l.urgencia}
                          onView={() => openLead(l)}
                          onChangeEstado={(estado) =>
                            updateOne(l.id, { estado }, `Estado: ${estado}`)
                          }
                          onToggleUrgente={() => {
                            const nuevo = !l.urgencia;
                            return updateOne(
                              l.id,
                              {
                                urgencia: nuevo,
                                semaforo: nuevo
                                  ? "rojo"
                                  : l.semaforo === "rojo"
                                    ? "ambar"
                                    : l.semaforo,
                                resultado_viabilidad: nuevo
                                  ? l.resultado_viabilidad === "inviable"
                                    ? "inviable"
                                    : "urgente"
                                  : l.resultado_viabilidad === "urgente"
                                    ? "viable"
                                    : l.resultado_viabilidad,
                              },
                              nuevo ? "Marcado como urgente" : "Urgencia retirada",
                            );
                          }}
                          onDelete={() => deleteOne(l.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BulkActionsBar
        count={selectedIds.size}
        busy={bulkBusy}
        onClear={() => setSelectedIds(new Set())}
        onChangeEstado={bulkChangeEstado}
        onToggleUrgente={bulkMarkUrgente}
        onDelete={bulkDelete}
      />

    </AdminLayout>
  );
}

function SortableTh({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: SortState;
  onSort: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 transition ${
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}
