import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  Eye,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { ESTADOS, type EstadoCaso } from "@/lib/leads";

interface Props {
  onView: () => void;
  onChangeEstado: (estado: EstadoCaso) => Promise<void> | void;
  onToggleUrgente: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  isUrgente: boolean;
}

/**
 * Menú de 3 puntos con acciones rápidas por fila de la tabla.
 * Stop-propagation para que el click en el menú no abra el drawer del lead.
 */
export function RowMenu({
  onView,
  onChangeEstado,
  onToggleUrgente,
  onDelete,
  isUrgente,
}: Props) {
  const [open, setOpen] = useState(false);
  const [estadoOpen, setEstadoOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEstadoOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Acciones"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
          setEstadoOpen(false);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <ul className="absolute right-0 z-30 mt-1 w-52 overflow-visible rounded-xl border border-border bg-background py-1 text-sm shadow-elegant">
          <li>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onView();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-muted"
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Ver detalle
            </button>
          </li>

          {/* Submenú estado */}
          <li
            className="relative"
            onMouseEnter={() => setEstadoOpen(true)}
            onMouseLeave={() => setEstadoOpen(false)}
          >
            <button
              type="button"
              onClick={() => setEstadoOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-foreground hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                Cambiar estado
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {estadoOpen && (
              <ul className="absolute left-full top-0 z-40 -ml-1 w-44 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-elegant">
                {ESTADOS.map((e) => (
                  <li key={e}>
                    <button
                      type="button"
                      onClick={async () => {
                        setOpen(false);
                        setEstadoOpen(false);
                        await onChangeEstado(e);
                      }}
                      className="flex w-full items-center px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted"
                    >
                      {e}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>

          <li>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await onToggleUrgente();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-muted"
            >
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              {isUrgente ? "Quitar urgente" : "Marcar urgente"}
            </button>
          </li>

          <li className="my-1 border-t border-border" aria-hidden />

          <li>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
