import { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { fetchHistorial, labelCampo, type HistorialEntry } from "@/lib/historial";
import { formatDate } from "@/lib/leads";

interface Props {
  leadId: string;
  /** clave que dispara recarga (cambia cuando el padre actualiza el lead). */
  reloadKey?: number;
}

/** Lista cronológica de cambios sobre un lead. */
export function LeadHistorial({ leadId, reloadKey = 0 }: Props) {
  const [items, setItems] = useState<HistorialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchHistorial(leadId).then((data) => {
      if (active) {
        setItems(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [leadId, reloadKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando historial...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin cambios registrados todavía. Las modificaciones futuras quedarán aquí.
      </p>
    );
  }

  return (
    <ol className="relative space-y-3 border-l border-border pl-4">
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span className="absolute -left-[19px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-accent" />
          <div className="rounded-lg border border-border bg-background p-3 text-sm shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-primary">{labelCampo(it.campo)}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatDate(it.created_at)}
              </span>
            </div>
            <p className="mt-1 text-xs text-foreground/85">
              {summary(it)}
            </p>
            {it.usuario_email && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                por {it.usuario_email}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function summary(it: HistorialEntry): string {
  const prev = it.valor_anterior ?? "—";
  const next = it.valor_nuevo ?? "—";
  return `de "${truncate(prev)}" a "${truncate(next)}"`;
}

function truncate(value: string, max = 80): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "…";
}
