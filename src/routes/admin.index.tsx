import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  LogOut,
  Search,
  Download,
  Inbox,
  AlertCircle,
  Loader2,
  RefreshCw,
  Scale,
  Bell,
  FileCheck2,
  CreditCard,
  Users,
  Euro,
  TrendingUp,
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
  PRECIO_FASE_I_EUR,
  semaforoConfig,
  perfilConfig,
  estadoBadgeClass,
  formatDateShort,
  formatEuros,
  exportLeadsToCSV,
  docsCompletos,
  type Lead,
  type Semaforo,
  type EstadoCaso,
  type Perfil,
} from "@/lib/leads";
import { LeadDrawer } from "@/components/admin/LeadDrawer";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { RowMenu } from "@/components/admin/RowMenu";

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

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Panel · Leads — Hispajuris · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPanel,
});

function AdminPanel() {
  const { session, isLawyer, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSem, setFilterSem] = useState<Semaforo | "todos">("todos");
  const [filterEstado, setFilterEstado] = useState<EstadoCaso | "todos">("todos");
  const [filterPerfil, setFilterPerfil] = useState<Perfil | "todos">("todos");
  const [filterPago, setFilterPago] = useState<"todos" | "si" | "no">("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "created_at", dir: "desc" });

  // Redirige si no hay sesión
  useEffect(() => {
    if (!authLoading && !session) {
      navigate({ to: "/admin/login" });
    }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  // Marca el lead como revisado al abrirlo (si no lo estaba)
  const openLead = async (lead: Lead) => {
    setSelectedId(lead.id);
    if (!lead.revisado) {
      const { data, error } = await supabase
        .from("leads_interinos")
        .update({ revisado: true, revisado_at: new Date().toISOString() })
        .eq("id", lead.id)
        .select()
        .single();
      if (!error && data) {
        setLeads((prev) => prev.map((l) => (l.id === data.id ? data : l)));
      }
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filterSem !== "todos" && l.semaforo !== filterSem) return false;
      if (filterEstado !== "todos" && l.estado !== filterEstado) return false;
      if (filterPerfil !== "todos" && l.perfil !== filterPerfil) return false;
      if (filterPago === "si" && !l.pago_completado) return false;
      if (filterPago === "no" && l.pago_completado) return false;
      if (q) {
        const blob =
          `${l.nombre} ${l.email} ${l.telefono} ${l.provincia} ${l.administracion}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, filterSem, filterEstado, filterPerfil, filterPago]);

  // Métricas
  const metrics = useMemo(() => {
    const total = leads.length;
    const noRevisados = leads.filter((l) => !l.revisado).length;
    const rojos = leads.filter((l) => l.semaforo === "rojo").length;
    const ambar = leads.filter((l) => l.semaforo === "ambar").length;
    const verdes = leads.filter((l) => l.semaforo === "verde").length;
    const clientes = leads.filter((l) => l.estado === "Cliente").length;
    const conversion = total > 0 ? Math.round((clientes / total) * 100) : 0;
    return { total, noRevisados, rojos, ambar, verdes, clientes, conversion };
  }, [leads]);

  const selectedLead = leads.find((l) => l.id === selectedId) || null;

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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-primary">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta no tiene permisos de abogado. Contacta con el administrador.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-light"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-navy text-accent">
              <Scale className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-primary">Panel · Hispajuris</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-accent">
                Asesor.Legal
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                const first = leads.find((l) => !l.revisado);
                if (first) openLead(first);
                else toast.info("Sin leads nuevos por revisar.");
              }}
              className="relative inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              aria-label={`${metrics.noRevisados} leads sin revisar`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sin revisar</span>
              {metrics.noRevisados > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {metrics.noRevisados}
                </span>
              )}
            </button>
            <span className="hidden text-muted-foreground sm:inline">{session.user.email}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary sm:text-3xl">Leads y casos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Solicitudes de diagnóstico recibidas desde la web pública.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refrescar
            </button>
            <button
              onClick={() => exportLeadsToCSV(filtered)}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV ({filtered.length})
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Total leads" value={metrics.total} icon={Inbox} />
          <MetricCard label="Sin revisar" value={metrics.noRevisados} icon={Bell} tone="destructive" />
          <MetricCard
            label="Urgentes"
            value={metrics.rojos}
            icon={AlertCircle}
            tone="destructive"
          />
          <MetricCard label="Revisar" value={metrics.ambar} icon={Info} tone="warning" />
          <MetricCard label="Posibles" value={metrics.verdes} icon={CheckCircle2} tone="success" />
          <MetricCard
            label="Conversión"
            value={`${metrics.conversion}%`}
            icon={Filter}
            tone="primary"
          />
        </div>

        {/* Filtros */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, teléfono o provincia..."
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
          </div>
        </div>

        {/* Tabla */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando leads...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                {leads.length === 0
                  ? "Aún no hay leads. Cuando alguien complete el diagnóstico aparecerá aquí."
                  : "Ningún lead coincide con los filtros."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Provincia</th>
                    <th className="px-4 py-3">Perfil</th>
                    <th className="px-4 py-3">Años</th>
                    <th className="px-4 py-3">Semáforo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-center" title="Documentación completa">
                      Docs
                    </th>
                    <th className="px-4 py-3 text-center" title="Pago Fase I cobrado">
                      Pago
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const sem = semaforoConfig(l.semaforo);
                    const per = perfilConfig(l.perfil);
                    const docs = docsCompletos(l.documentos_disponibles);
                    return (
                      <tr
                        key={l.id}
                        onClick={() => openLead(l)}
                        className={`cursor-pointer border-b border-border last:border-0 transition hover:bg-accent-soft/30 ${
                          !l.revisado ? "bg-primary/5" : ""
                        }`}
                      >
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedId(null)}
        onUpdated={(updated) => {
          setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: "default" | "destructive" | "warning" | "success" | "accent" | "primary";
}) {
  const tones: Record<string, string> = {
    default: "text-muted-foreground",
    destructive: "text-destructive",
    warning: "text-warning",
    success: "text-success",
    accent: "text-accent",
    primary: "text-primary",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${tones[tone]}`} />
      </div>
      <div className="mt-2 text-2xl font-bold text-primary">{value}</div>
    </div>
  );
}
