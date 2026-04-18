import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Inbox,
  Calculator,
  Briefcase,
  AlertTriangle,
  ClipboardList,
  Euro,
  X,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PeritoLayout } from "@/components/perito/PeritoLayout";
import { LeadValoracion } from "@/components/perito/LeadValoracion";
import {
  semaforoConfig,
  perfilConfig,
  estadoBadgeClass,
  formatDateShort,
  type Lead,
} from "@/lib/leads";

export const Route = createFileRoute("/perito/")({
  head: () => ({
    meta: [
      { title: "Mis casos — Panel perito · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PeritoPanel,
});

function PeritoPanel() {
  const { session, isPerito, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  useEffect(() => {
    if (!authLoading && session && isAdmin && !isPerito) {
      navigate({ to: "/admin" });
    }
  }, [authLoading, session, isAdmin, isPerito, navigate]);

  const fetchLeads = async () => {
    setLoading(true);
    // RLS limita: admin ve todo, perito ve donde tiene valoración o todos los leads visibles según su rol.
    // Como el perito no tiene asignación directa todavía, mostramos todos los que pueda ver via RLS
    // (admins ven todos; peritos verán leads cuando se les asigne caso vía valoración existente o admin).
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
    if (session && isPerito) fetchLeads();
  }, [session, isPerito]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const urgentes = leads.filter((l) => l.urgencia || l.semaforo === "rojo").length;
    const enEstudio = leads.filter((l) => l.estado === "En estudio").length;
    const pagados = leads.filter((l) => l.pago_completado).length;
    return { total, urgentes, enEstudio, pagados };
  }, [leads]);

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

  if (!isPerito) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-primary">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta no tiene permisos de perito. Contacta con el administrador.
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
    <button
      onClick={fetchLeads}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Refrescar</span>
    </button>
  );

  return (
    <PeritoLayout
      title="Mis casos"
      subtitle="Casos en los que debes calcular la indemnización y conceptos a reclamar."
      actions={headerActions}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Briefcase} label="Casos visibles" value={metrics.total} tone="primary" />
        <Kpi icon={AlertTriangle} label="Urgentes" value={metrics.urgentes} tone="destructive" />
        <Kpi icon={ClipboardList} label="En estudio" value={metrics.enEstudio} tone="accent" />
        <Kpi icon={Euro} label="Pagados" value={metrics.pagados} tone="warning" />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Casos a valorar ({leads.length})
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No tienes casos visibles todavía.
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
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const sem = semaforoConfig(l.semaforo);
                  const per = perfilConfig(l.perfil);
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent-soft/30"
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
                          <Calculator className="h-3 w-3" /> Valorar
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLead && (
        <ValoracionDrawer
          lead={selectedLead}
          canEdit={isPerito}
          onClose={() => setSelectedId(null)}
        />
      )}
    </PeritoLayout>
  );
}

function ValoracionDrawer({
  lead,
  canEdit,
  onClose,
}: {
  lead: Lead;
  canEdit: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-primary/40 backdrop-blur-sm" />
      <aside
        className="flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-border bg-background shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Caso #{lead.id.slice(0, 8)}
            </p>
            <h2 className="text-base font-bold text-primary">{lead.nombre}</h2>
            <p className="text-xs text-muted-foreground">
              {lead.provincia} · {lead.administracion} · {lead.anos_servicio} años
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 p-5">
          <LeadValoracion leadId={lead.id} canEdit={canEdit} />
        </div>
      </aside>
    </div>
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
