import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Bell,
  AlertCircle,
  Euro,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  formatEuros,
  semaforoConfig,
  PRECIO_FASE_I_EUR,
  type Lead,
} from "@/lib/leads";
import {
  calcularMetricasFinancieras,
  comparativaMensual,
  leadsPorSemana,
} from "@/lib/finanzas";

interface Props {
  leads: Lead[];
  onOpenLead: (l: Lead) => void;
  onApplyFilter?: (preset: "todos" | "pendientes" | "urgentes" | "cobrados" | "clientes") => void;
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function DashboardOverview({ leads, onOpenLead, onApplyFilter }: Props) {
  const metrics = useMemo(() => {
    const total = leads.length;
    const pendientes = leads.filter((l) => l.estado === "Nuevo" && !l.revisado).length;
    const urgentes = leads.filter((l) => l.semaforo === "rojo" || l.urgencia).length;
    const cobradosNum = leads.filter((l) => l.pago_completado).length;
    const cobradosEur = leads
      .filter((l) => l.pago_completado)
      .reduce((acc, l) => acc + (Number(l.pago_importe) || PRECIO_FASE_I_EUR), 0);
    const clientes = leads.filter((l) => l.estado === "Cliente").length;
    const conversion = total > 0 ? Math.round((clientes / total) * 100) : 0;
    return { total, pendientes, urgentes, cobradosEur, cobradosNum, conversion };
  }, [leads]);

  const finanzas = useMemo(() => calcularMetricasFinancieras(leads), [leads]);
  const compa = useMemo(() => comparativaMensual(leads), [leads]);
  const semanas = useMemo(() => leadsPorSemana(leads, 8), [leads]);

  const recientes = useMemo(() => {
    const limite = Date.now() - 24 * 60 * 60 * 1000;
    return leads
      .filter((l) => new Date(l.created_at).getTime() >= limite)
      .slice(0, 5);
  }, [leads]);

  const urgentesList = useMemo(() => {
    return leads
      .filter((l) => (l.semaforo === "rojo" || l.urgencia) && l.estado !== "Descartado")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [leads]);

  return (
    <div className="space-y-5">
      {/* Fila 1 — KPIs todos en azul marino, diferenciados por badge */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPI
          label="Total leads"
          value={metrics.total}
          icon={Users}
          onClick={() => onApplyFilter?.("todos")}
        />
        <KPI
          label="Pendiente revisar"
          value={metrics.pendientes}
          icon={Bell}
          badgeColor="#e8a020"
          onClick={() => onApplyFilter?.("pendientes")}
        />
        <KPI
          label="Urgentes"
          value={metrics.urgentes}
          icon={AlertCircle}
          badgeColor="#dc2626"
          onClick={() => onApplyFilter?.("urgentes")}
        />
        <KPI
          label="Cobrado"
          value={formatEuros(metrics.cobradosEur)}
          hint={`${metrics.cobradosNum} pago${metrics.cobradosNum === 1 ? "" : "s"}`}
          icon={Euro}
          onClick={() => onApplyFilter?.("cobrados")}
        />
        <KPI
          label="Conversión"
          value={`${metrics.conversion}%`}
          icon={TrendingUp}
          onClick={() => onApplyFilter?.("clientes")}
        />
      </div>

      {/* Fila 2 — Actividad reciente */}
      <div className={`grid gap-4 ${recientes.length > 0 ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        {recientes.length > 0 && (
        <PanelLista
          title="Nuevos contactos · últimas 24 h"
          icon={Clock}
          tone="primary"
          empty=""
        >
          {recientes.map((l) => {
            const cfg = semaforoConfig(l.semaforo);
            return (
              <button
                key={l.id}
                onClick={() => onOpenLead(l)}
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cfg.emoji}</span>
                    <span className="truncate text-sm font-semibold text-foreground">
                      {l.nombre}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {l.provincia} · {l.administracion}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {tiempoRelativo(l.created_at)}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-accent" />
                </div>
              </button>
            );
          })}
        </PanelLista>
        )}


        <PanelLista
          title="Requieren atención urgente"
          icon={AlertCircle}
          tone="destructive"
          empty="Sin casos urgentes pendientes."
        >
          {urgentesList.map((l) => {
            const dias = Math.floor(
              (Date.now() - new Date(l.created_at).getTime()) / (24 * 60 * 60 * 1000),
            );
            return (
              <button
                key={l.id}
                onClick={() => onOpenLead(l)}
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition hover:border-destructive hover:bg-destructive/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {l.nombre}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {l.situacion_actual}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="rounded-full px-2 py-0.5 font-semibold text-white"
                    style={{ backgroundColor: "#dc2626" }}
                  >
                    {dias === 0 ? "hoy" : `${dias}d`}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-destructive" />
                </div>
              </button>
            );
          })}
        </PanelLista>
      </div>

      {/* Fila 3 — Mini financiero (todas en gris claro con borde superior azul) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <MiniFin
          label="Ingresos este mes"
          value={formatEuros(compa.esteMes)}
          delta={compa.variacionPct}
          deltaLabel={`vs ${formatEuros(compa.mesAnterior)} mes anterior`}
        />
        <MiniFin
          label="Pendiente cobro Fase I"
          value={formatEuros(finanzas.pendienteCobroEur)}
          deltaLabel={`${finanzas.pendienteCobroNum} caso${finanzas.pendienteCobroNum === 1 ? "" : "s"} sin pagar`}
        />
        <MiniFin
          label="Estimación cuota litis"
          value={`${formatEuros(finanzas.estimacionCuotaLitisMin)} – ${formatEuros(finanzas.estimacionCuotaLitisMax)}`}
          deltaLabel="Sobre casos en estado Cliente"
          link={{ to: "/admin/finanzas", label: "Ver finanzas →" }}
        />
      </div>

      {/* Fila 4 — Gráfico (al final, compacto) */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="text-sm font-bold text-primary">Leads por semana</h3>
            <p className="text-[11px] text-muted-foreground">
              Últimas 8 semanas · barras = leads, línea = % conversión a Cliente
            </p>
          </div>
        </div>
        <div style={{ height: "180px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={semanas} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="semana"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                wrapperStyle={{ pointerEvents: "none" }}
                isAnimationActive={false}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="left"
                dataKey="total"
                name="Leads"
                fill="#1a3a5c"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversionPct"
                name="Conversión %"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--accent))" }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ============== Subcomponentes ============== */

interface KPIProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Users;
  badgeColor?: string;
  onClick?: () => void;
}

function KPI({ label, value, hint, icon: Icon, badgeColor, onClick }: KPIProps) {
  const Wrapper: "button" | "div" = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{ backgroundColor: "#1a3a5c", maxHeight: "80px" }}
      className={`relative flex flex-col justify-between rounded-xl px-3 py-2.5 text-left text-white shadow-card transition ${
        onClick ? "cursor-pointer hover:brightness-110 hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/75">
          {label}
        </span>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
          <Icon className="h-3 w-3" />
        </span>
      </div>
      <div className="mt-0.5 flex items-end gap-1.5">
        <div className="text-xl font-bold leading-none text-white">{value}</div>
        {badgeColor && (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: badgeColor }}
            aria-hidden
          />
        )}
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-white/75">{hint}</div>}
    </Wrapper>
  );
}

interface PanelListaProps {
  title: string;
  icon: typeof Bell;
  tone: "primary" | "destructive";
  empty: string;
  children: React.ReactNode;
}

function PanelLista({ title, icon: Icon, tone, empty, children }: PanelListaProps) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;
  const borderColor = tone === "destructive" ? "#dc2626" : "#1a3a5c";
  const ringClass =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : "bg-primary/10 text-primary";
  return (
    <div
      className="rounded-2xl border border-border bg-white p-5 shadow-card"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${ringClass}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-bold text-primary">{title}</h3>
      </div>
      {isEmpty ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

interface MiniFinProps {
  label: string;
  value: string;
  delta?: number;
  deltaLabel: string;
  link?: { to: string; label: string };
}

function MiniFin({ label, value, delta, deltaLabel, link }: MiniFinProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className="rounded-xl border border-border p-4 shadow-sm"
      style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #1a3a5c" }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-bold text-primary">{value}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
        {typeof delta === "number" && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${
              positive
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
        <span className="text-muted-foreground">{deltaLabel}</span>
      </div>
      {link && (
        <Link
          to={link.to}
          className="mt-2 inline-flex text-[11px] font-semibold text-accent hover:underline"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}
