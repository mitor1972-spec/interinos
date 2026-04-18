import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Loader2,
  LogOut,
  Scale,
  AlertCircle,
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Euro,
  Trophy,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  PRECIO_FASE_I_EUR,
  formatEuros,
  type Lead,
  type EstadoCaso,
  type Perfil,
} from "@/lib/leads";
import { listarAbogados, type AbogadoConDespacho } from "@/lib/abogados";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/informes")({
  head: () => ({
    meta: [
      { title: "Panel · Informes — Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InformesPage,
});

const COLORS = ["#1e3a8a", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function InformesPage() {
  const { session, isLawyer, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [abogados, setAbogados] = useState<AbogadoConDespacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [{ from, to }, setRange] = useState(defaultRange());

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  const load = async () => {
    setLoading(true);
    const fromIso = new Date(from + "T00:00:00").toISOString();
    const toIso = new Date(to + "T23:59:59").toISOString();
    const [{ data: leadsData, error: leadsErr }, abList] = await Promise.all([
      supabase
        .from("leads_interinos")
        .select("*")
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .order("created_at", { ascending: false }),
      listarAbogados(),
    ]);
    setLoading(false);
    if (leadsErr) {
      toast.error("Error cargando leads: " + leadsErr.message);
      return;
    }
    setLeads((leadsData ?? []) as Lead[]);
    setAbogados(abList);
  };

  useEffect(() => {
    if (session && isLawyer) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isLawyer, from, to]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  // ====== Métricas ======
  const totals = useMemo(() => {
    const total = leads.length;
    const clientes = leads.filter((l) => l.estado === "Cliente").length;
    const cobrados = leads.filter((l) => l.pago_completado);
    const ingresos = cobrados.reduce(
      (acc, l) => acc + (Number(l.pago_importe) || PRECIO_FASE_I_EUR),
      0,
    );
    const conversion = total > 0 ? (clientes / total) * 100 : 0;
    return {
      total,
      clientes,
      ingresos,
      pagosCount: cobrados.length,
      conversion: Math.round(conversion * 10) / 10,
    };
  }, [leads]);

  const porMes = useMemo(() => {
    const map = new Map<string, { mes: string; leads: number; ingresos: number }>();
    for (const l of leads) {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = map.get(key) ?? { mes: key, leads: 0, ingresos: 0 };
      cur.leads += 1;
      if (l.pago_completado) {
        cur.ingresos += Number(l.pago_importe) || PRECIO_FASE_I_EUR;
      }
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [leads]);

  const porEstado = useMemo(() => {
    const counter: Record<EstadoCaso, number> = {
      Nuevo: 0,
      "En estudio": 0,
      "Propuesta enviada": 0,
      Cliente: 0,
      Descartado: 0,
    };
    for (const l of leads) counter[l.estado] = (counter[l.estado] ?? 0) + 1;
    return Object.entries(counter).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const porPerfil = useMemo(() => {
    const counter: Record<Perfil, number> = { laboral: 0, funcionario: 0, desconocido: 0 };
    for (const l of leads) counter[l.perfil] = (counter[l.perfil] ?? 0) + 1;
    return Object.entries(counter)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [leads]);

  const porProvincia = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) {
      const k = l.provincia?.trim() || "—";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([provincia, leads]) => ({ provincia, leads }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 10);
  }, [leads]);

  const porMetodoPago = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) {
      if (!l.pago_completado) continue;
      const k = l.metodo_pago ?? "sin_definir";
      map.set(k, (map.get(k) ?? 0) + (Number(l.pago_importe) || PRECIO_FASE_I_EUR));
    }
    return Array.from(map.entries()).map(([metodo, importe]) => ({ metodo, importe }));
  }, [leads]);

  const rankingAbogados = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; leads: number; clientes: number; ingresos: number }>();
    const abogadoNombre = (id: string | null) =>
      abogados.find((a) => a.id === id)?.nombre ?? "Sin asignar";
    for (const l of leads) {
      const id = l.asignado_a ?? "sin_asignar";
      const cur =
        map.get(id) ?? { id, nombre: abogadoNombre(l.asignado_a), leads: 0, clientes: 0, ingresos: 0 };
      cur.leads += 1;
      if (l.estado === "Cliente") cur.clientes += 1;
      if (l.pago_completado) cur.ingresos += Number(l.pago_importe) || PRECIO_FASE_I_EUR;
      map.set(id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.ingresos - a.ingresos || b.leads - a.leads);
  }, [leads, abogados]);

  const exportCsv = () => {
    const rows = [
      ["Métrica", "Valor"],
      ["Total leads", String(totals.total)],
      ["Clientes", String(totals.clientes)],
      ["Conversión %", String(totals.conversion)],
      ["Ingresos (€)", String(totals.ingresos.toFixed(2))],
      ["Pagos confirmados", String(totals.pagosCount)],
      [],
      ["Mes", "Leads", "Ingresos (€)"],
      ...porMes.map((m) => [m.mes, String(m.leads), m.ingresos.toFixed(2)]),
      [],
      ["Estado", "Casos"],
      ...porEstado.map((e) => [e.name, String(e.value)]),
      [],
      ["Provincia", "Leads"],
      ...porProvincia.map((p) => [p.provincia, String(p.leads)]),
      [],
      ["Abogado", "Leads", "Clientes", "Ingresos (€)"],
      ...rankingAbogados.map((a) => [
        a.nombre,
        String(a.leads),
        String(a.clientes),
        a.ingresos.toFixed(2),
      ]),
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe-${from}_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      <AdminLayout title="Informes">
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-bold text-primary">Acceso restringido</h1>
        </div>
      </AdminLayout>
    );
  }

  const headerActions = (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Desde
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Hasta
        </label>
        <input
          type="date"
          value={to}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <button
        onClick={exportCsv}
        disabled={leads.length === 0}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" /> CSV
      </button>
    </div>
  );

  return (
    <AdminLayout
      title="Informes"
      subtitle="Métricas, conversión, ingresos y ranking de abogados."
      actions={headerActions}
    >

        {loading ? (
          <div className="mt-10 flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando informe...
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Leads" value={totals.total} icon={Users} />
              <Kpi label="Clientes" value={totals.clientes} icon={Trophy} tone="success" />
              <Kpi
                label="Conversión"
                value={`${totals.conversion}%`}
                icon={TrendingUp}
                tone="primary"
              />
              <Kpi
                label="Ingresos"
                value={formatEuros(totals.ingresos)}
                hint={`${totals.pagosCount} pago(s)`}
                icon={Euro}
                tone="success"
              />
            </div>

            {/* Gráficos */}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card title="Leads e ingresos por mes">
                {porMes.length === 0 ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={porMes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="leads"
                        stroke="#1e3a8a"
                        strokeWidth={2}
                        name="Leads"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="ingresos"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Ingresos €"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card title="Distribución por estado">
                {porEstado.every((e) => e.value === 0) ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={porEstado.filter((e) => e.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {porEstado.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card title="Top 10 provincias por leads">
                {porProvincia.length === 0 ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={porProvincia} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="provincia" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="leads" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card title="Distribución por perfil">
                {porPerfil.length === 0 ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={porPerfil}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {porPerfil.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card title="Ingresos por método de pago">
                {porMetodoPago.length === 0 ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={porMetodoPago}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="metodo" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatEuros(v)} />
                      <Bar dataKey="importe" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card title="Ranking de abogados">
                {rankingAbogados.length === 0 ? (
                  <Empty />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2">Abogado</th>
                          <th className="px-3 py-2 text-right">Leads</th>
                          <th className="px-3 py-2 text-right">Clientes</th>
                          <th className="px-3 py-2 text-right">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankingAbogados.map((a) => (
                          <tr key={a.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 font-semibold text-foreground">{a.nombre}</td>
                            <td className="px-3 py-2 text-right">{a.leads}</td>
                            <td className="px-3 py-2 text-right">{a.clientes}</td>
                            <td className="px-3 py-2 text-right font-bold text-success">
                              {formatEuros(a.ingresos)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "primary" | "warning";
}) {
  const tones: Record<string, string> = {
    default: "text-muted-foreground",
    success: "text-success",
    primary: "text-primary",
    warning: "text-warning",
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
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      Sin datos para el rango seleccionado
    </div>
  );
}
