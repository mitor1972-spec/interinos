import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Loader2,
  Download,
  Wallet,
  Euro,
  CreditCard,
  Hourglass,
  TrendingUp,
  Scale,
  LogOut,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  formatEuros,
  PRECIO_FASE_I_EUR,
  PERFILES,
  ESTADOS,
  type Lead,
  type Perfil,
  type EstadoCaso,
} from "@/lib/leads";
import {
  calcularMetricasFinancieras,
  ingresosPorMes,
  exportFinanzasCSV,
  INDEMNIZACION_MEDIA_LABORAL_EUR,
  INDEMNIZACION_MEDIA_FUNCIONARIO_EUR,
  CUOTA_LITIS_LABORAL_PCT,
  CUOTA_LITIS_FUNCIONARIO_PCT,
} from "@/lib/finanzas";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/finanzas")({
  head: () => ({
    meta: [
      { title: "Finanzas — Panel Hispajuris" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FinanzasPage,
});

function FinanzasPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMes, setFilterMes] = useState<string>("todos");
  const [filterEstado, setFilterEstado] = useState<EstadoCaso | "todos">("todos");
  const [filterPerfil, setFilterPerfil] = useState<Perfil | "todos">("todos");

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  useEffect(() => {
    if (!session || !isAdmin) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads_interinos")
        .select("*")
        .order("created_at", { ascending: false });
      setLoading(false);
      if (error) {
        toast.error("Error cargando datos: " + error.message);
        return;
      }
      setLeads(data || []);
    })();
  }, [session, isAdmin]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterEstado !== "todos" && l.estado !== filterEstado) return false;
      if (filterPerfil !== "todos" && l.perfil !== filterPerfil) return false;
      if (filterMes !== "todos") {
        const ref = l.pago_fecha ?? l.created_at;
        const d = new Date(ref);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key !== filterMes) return false;
      }
      return true;
    });
  }, [leads, filterEstado, filterPerfil, filterMes]);

  const metrics = useMemo(() => calcularMetricasFinancieras(filtered), [filtered]);
  const ingresos = useMemo(() => ingresosPorMes(leads, 6), [leads]);

  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) {
      const ref = l.pago_fecha ?? l.created_at;
      const d = new Date(ref);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return Array.from(set).sort().reverse();
  }, [leads]);

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
      <AdminLayout title="Finanzas">
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <h1 className="text-xl font-bold text-primary">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Solo administradores pueden acceder al panel de finanzas.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const headerActions = (
    <button
      onClick={() => exportFinanzasCSV(filtered)}
      disabled={filtered.length === 0}
      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      CSV ({filtered.length})
    </button>
  );

  return (
    <AdminLayout
      title="Finanzas"
      subtitle="Visión económica del despacho · ingresos confirmados, pendientes y estimación de cuota litis."
      actions={headerActions}
    >

        {/* Tarjetas — 6 métricas */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label="Casos totales"
            value={metrics.casosTotales}
            icon={Briefcase}
          />
          <MetricCard
            label="Pagados Fase I"
            value={metrics.pagadosNum}
            hint={formatEuros(metrics.pagadosEur)}
            icon={CreditCard}
            tone="success"
          />
          <MetricCard
            label="Pendiente cobro"
            value={metrics.pendienteCobroNum}
            hint={formatEuros(metrics.pendienteCobroEur)}
            icon={Hourglass}
            tone="warning"
          />
          <MetricCard
            label="Ingresos confirmados"
            value={formatEuros(metrics.ingresosConfirmadosEur)}
            icon={Euro}
            tone="primary"
          />
          <MetricCard
            label="Estim. cuota litis"
            value={`${formatEuros(metrics.estimacionCuotaLitisMin)}`}
            hint={`hasta ${formatEuros(metrics.estimacionCuotaLitisMax)}`}
            icon={Wallet}
            tone="accent"
          />
          <MetricCard
            label="Conversión"
            value={`${metrics.conversionPct}%`}
            icon={TrendingUp}
          />
        </div>

        {/* Gráfico ingresos por mes */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-bold text-primary">
            Ingresos confirmados por mes
          </h3>
          <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ingresos}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}€`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatEuros(v)}
                />
                <Bar
                  dataKey="importe"
                  name="Importe"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option value="todos">Todos los meses</option>
              {mesesDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
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
          </div>
        </div>

        {/* Tabla detallada */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Perfil</th>
                  <th className="px-4 py-3 font-semibold">Fase I pagada</th>
                  <th className="px-4 py-3 font-semibold">Fecha pago</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Estimación cuota litis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      Sin resultados con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => {
                    const importe = l.pago_completado
                      ? Number(l.pago_importe) || PRECIO_FASE_I_EUR
                      : 0;
                    let estimacion = 0;
                    if (l.estado === "Cliente") {
                      if (l.perfil === "laboral") {
                        estimacion =
                          (INDEMNIZACION_MEDIA_LABORAL_EUR *
                            CUOTA_LITIS_LABORAL_PCT) /
                          100;
                      } else if (l.perfil === "funcionario") {
                        estimacion =
                          (INDEMNIZACION_MEDIA_FUNCIONARIO_EUR *
                            CUOTA_LITIS_FUNCIONARIO_PCT) /
                          100;
                      }
                    }
                    return (
                      <tr key={l.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {l.nombre}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {l.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{l.perfil}</td>
                        <td className="px-4 py-3">
                          {l.pago_completado ? (
                            <span className="text-success font-semibold">
                              {formatEuros(importe)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {l.pago_fecha
                            ? new Date(l.pago_fecha).toLocaleDateString("es-ES")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">{l.estado}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">
                          {estimacion > 0 ? formatEuros(estimacion) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
        ⚖️ Las estimaciones de cuota litis son orientativas y dependen del
        resultado final de cada caso. Cálculo basado en una indemnización media
        de {formatEuros(INDEMNIZACION_MEDIA_LABORAL_EUR)} (laboral) y{" "}
        {formatEuros(INDEMNIZACION_MEDIA_FUNCIONARIO_EUR)} (funcionario), con{" "}
        {CUOTA_LITIS_LABORAL_PCT}% / {CUOTA_LITIS_FUNCIONARIO_PCT}% de cuota
        litis respectivamente.
      </p>
    </AdminLayout>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Wallet;
  tone?: "default" | "warning" | "success" | "primary" | "accent";
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-muted/40 text-foreground",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent-foreground",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${toneClasses[tone]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 text-xl font-bold text-primary">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
