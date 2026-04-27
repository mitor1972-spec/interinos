import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  ultimaValidacion,
  lanzarValidacion,
  normalizarLista,
  type ValidacionIA,
} from "@/lib/validacionIa";

interface Props {
  leadId: string;
}

export function LeadValidacionIA({ leadId }: Props) {
  const [val, setVal] = useState<ValidacionIA | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function cargar() {
    setLoading(true);
    setVal(await ultimaValidacion(leadId));
    setLoading(false);
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  async function ejecutar() {
    setRunning(true);
    const r = await lanzarValidacion(leadId);
    setRunning(false);
    if (!r.ok) return toast.error(r.error ?? "No se pudo validar");
    toast.success("Análisis completado");
    void cargar();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando validación…</p>;

  const incoherencias = val ? normalizarLista(val.incoherencias) : [];
  const avisos = val ? normalizarLista(val.avisos) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {val ? (
          <p className="text-xs text-muted-foreground">
            Último análisis: {new Date(val.created_at).toLocaleString("es-ES")}
            {val.modelo ? ` · ${val.modelo}` : ""}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Aún no se ha ejecutado validación IA.</p>
        )}
        <button
          onClick={ejecutar}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : val ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {running ? "Analizando…" : val ? "Volver a analizar" : "Analizar coherencia"}
        </button>
      </div>

      {val && (
        <>
          {val.resumen && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resumen
              </p>
              <p className="mt-1 text-foreground">{val.resumen}</p>
            </div>
          )}

          <Bloque
            titulo="Incoherencias detectadas"
            items={incoherencias}
            empty="Sin incoherencias"
            tone="danger"
          />
          <Bloque
            titulo="Avisos legales"
            items={avisos}
            empty="Sin avisos"
            tone="warning"
          />
        </>
      )}
    </div>
  );
}

function Bloque({
  titulo,
  items,
  empty,
  tone,
}: {
  titulo: string;
  items: { campo?: string; descripcion: string; severidad?: string }[];
  empty: string;
  tone: "danger" | "warning";
}) {
  const Icon = tone === "danger" ? AlertTriangle : ShieldCheck;
  const cls =
    tone === "danger"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : "border-amber-300 bg-amber-50 text-amber-800";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {titulo} ({items.length})
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs opacity-80">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm">
          {items.map((it, i) => (
            <li key={i} className="rounded-lg bg-background/60 px-2.5 py-1.5 text-foreground">
              {it.campo && (
                <span className="mr-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  {it.campo}
                </span>
              )}
              {it.descripcion}
              {it.severidad && (
                <span className="ml-2 text-[10px] uppercase opacity-70">[{it.severidad}]</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
