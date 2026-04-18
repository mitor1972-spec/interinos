import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Inbox,
  FileCheck2,
  CreditCard,
  Briefcase,
  AlertTriangle,
  FileWarning,
  ClipboardList,
  Download,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AbogadoLayout } from "@/components/abogado/AbogadoLayout";
import { LeadDrawer } from "@/components/admin/LeadDrawer";
import {
  semaforoConfig,
  perfilConfig,
  estadoBadgeClass,
  formatDateShort,
  exportLeadsToCSV,
  docsCompletos,
  type Lead,
} from "@/lib/leads";

export const Route = createFileRoute("/abogado/")({
  head: () => ({
    meta: [
      { title: "Mis casos — Panel abogado · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AbogadoPanel,
});

function AbogadoPanel() {
  const { session, isLawyer, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  // Si por algún motivo entra un admin aquí, lo mandamos al panel completo
  useEffect(() => {
    if (!authLoading && session && isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [authLoading, session, isAdmin, navigate]);

  const fetchLeads = async () => {
    setLoading(true);
    // RLS limita automáticamente a los casos asignados a este abogado
    const { data, error } = await supabase
      .from("leads_interinos")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Error cargando casos: " + error.message);
      return;
    }
    setLeads(data || []);
  };

  useEffect(() => {
    if (session && isLawyer && !isAdmin) fetchLeads();
  }, [session, isLawyer, isAdmin]);

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

  const metrics = useMemo(() => {
    const total = leads.length;
    const urgentes = leads.filter(
      (l) => l.urgencia || l.semaforo === "rojo",
    ).length;
    const sinDocs = leads.filter((l) => !docsCompletos(l.documentos_disponibles)).length;
    const enEstudio = leads.filter((l) => l.estado === "En estudio").length;
    return { total, urgentes, sinDocs, enEstudio };
  }, [leads]);

  const urgentes = useMemo(
    () => leads.filter((l) => l.urgencia || l.semaforo === "rojo"),
    [leads],
  );

  const sinDocs = useMemo(
    () => leads.filter((l) => !docsCompletos(l.documentos_disponibles)),
    [leads],
  );

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

  const selectedLead = leads.find((l) => l.id === selectedId) || null;

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
        onClick={() => exportLeadsToCSV(leads)}
        disabled={leads.length === 0}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        Mis casos ({leads.length})
      </button>
    </>
  );

  return (
    <AbogadoLayout
      title="Mis casos"
      subtitle="Casos asignados a tu cuenta. Solo ves los tuyos."
      actions={headerActions}
    >
      {/* KPIs propios */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Briefcase} label="Mis casos" value={metrics.total} tone="primary" />
        <Kpi icon={AlertTriangle} label="Urgentes" value={metrics.urgentes} tone="destructive" />
        <Kpi icon={FileWarning} label="Sin docs" value={metrics.sinDocs} tone="warning" />
        <Kpi icon={ClipboardList} label="En estudio" value={metrics.enEstudio} tone="accent" />
      </div>

      {/* Listas rápidas */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <QuickList
          title="🔴 Casos urgentes"
          items={urgentes}
          empty="Ningún caso marcado como urgente. Bien."
          onOpen={openLead}
        />
        <QuickList
          title="📂 Pendientes de documentación"
          items={sinDocs}
          empty="Toda la documentación está al día."
          onOpen={openLead}
        />
      </div>

      {/* Tabla completa */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Todos mis casos ({leads.length})
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No tienes casos asignados todavía.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Provincia</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Semáforo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-center">Docs</th>
                  <th className="px-4 py-3 text-center">Pago</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const sem = semaforoConfig(l.semaforo);
                  const per = perfilConfig(l.perfil);
                  const docs = docsCompletos(l.documentos_disponibles);
                  return (
                    <tr
                      key={l.id}
                      onClick={() => openLead(l)}
                      className={`cursor-pointer border-b border-border last:border-0 hover:bg-accent-soft/30 ${
                        !l.revisado ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateShort(l.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{l.nombre}</div>
                        <div className="text-xs text-muted-foreground">{l.email}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{l.provincia}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${per.className}`}
                        >
                          {per.label}
                        </span>
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
                          <FileCheck2 className="mx-auto h-4 w-4 text-success" />
                        ) : (
                          <span className="text-muted-foreground">⏳</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {l.pago_completado ? (
                          <CreditCard className="mx-auto h-4 w-4 text-success" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
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

      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedId(null)}
        onUpdated={(updated) =>
          setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
        }
      />
    </AbogadoLayout>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
  tone: "primary" | "destructive" | "warning" | "accent";
}) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning-foreground",
    accent: "bg-accent/15 text-accent-foreground",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold text-primary">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickList({
  title,
  items,
  empty,
  onOpen,
}: {
  title: string;
  items: Lead[];
  empty: string;
  onOpen: (l: Lead) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-4 py-3 text-sm font-bold text-primary">
        {title} <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto">
          {items.slice(0, 6).map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onOpen(l)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{l.nombre}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {l.provincia} · {l.estado}
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {formatDateShort(l.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
