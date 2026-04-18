import { useState } from "react";
import { AlertCircle, ChevronDown, Loader2, Trash2, X } from "lucide-react";
import { ESTADOS, type EstadoCaso } from "@/lib/leads";

interface Props {
  count: number;
  onClear: () => void;
  onChangeEstado: (estado: EstadoCaso) => Promise<void> | void;
  onToggleUrgente: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  busy?: boolean;
}

/**
 * Barra flotante de acciones masivas, visible cuando hay leads seleccionados.
 */
export function BulkActionsBar({
  count,
  onClear,
  onChangeEstado,
  onToggleUrgente,
  onDelete,
  busy,
}: Props) {
  const [estadoOpen, setEstadoOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-[min(96vw,720px)] -translate-x-1/2">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary px-4 py-3 text-primary-foreground shadow-elegant">
        <button
          type="button"
          onClick={onClear}
          aria-label="Quitar selección"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="text-sm font-bold">
          {count} seleccionado{count === 1 ? "" : "s"}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Cambiar estado */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setEstadoOpen((v) => !v)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 disabled:opacity-50"
            >
              Cambiar estado <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {estadoOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setEstadoOpen(false)}
                  aria-hidden
                />
                <ul className="absolute bottom-full right-0 z-20 mb-2 w-48 overflow-hidden rounded-xl border border-border bg-background py-1 text-foreground shadow-elegant">
                  {ESTADOS.map((e) => (
                    <li key={e}>
                      <button
                        type="button"
                        onClick={async () => {
                          setEstadoOpen(false);
                          await onChangeEstado(e);
                        }}
                        className="flex w-full items-center px-3 py-2 text-left text-xs font-medium hover:bg-muted"
                      >
                        {e}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleUrgente}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/20 disabled:opacity-50"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Marcar urgente
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
