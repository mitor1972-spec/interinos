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
 * Posicionamiento absoluto respecto al contenedor padre (debe ser relative).
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      setOpen(false);
      setEstadoOpen(false);
    };
    const onScroll = () => {
      setOpen(false);
      setEstadoOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setEstadoOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
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
        <ul
          translate="no"
          className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-border bg-background py-1 text-sm shadow-elegant"
          onClick={(e) => e.stopPropagation()}
        >
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
              <ul className="absolute right-full top-0 z-[51] mr-1 w-44 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-elegant">
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
