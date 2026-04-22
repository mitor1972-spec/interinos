import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * Se abre hacia arriba automáticamente si no hay espacio debajo.
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
  const [openUp, setOpenUp] = useState(false);
  const [estadoUp, setEstadoUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

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

  // Decidir dirección de apertura según espacio disponible
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 220; // altura aproximada del menú principal
    setOpenUp(spaceBelow < menuHeight && rect.top > menuHeight);
  }, [open]);

  // Decidir dirección del submenú "Cambiar estado"
  useLayoutEffect(() => {
    if (!estadoOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.top;
    const submenuHeight = 200;
    setEstadoUp(spaceBelow < submenuHeight && rect.bottom > submenuHeight);
  }, [estadoOpen]);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
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
          ref={menuRef}
          className={`absolute right-0 z-30 w-52 overflow-visible rounded-xl border border-border bg-background py-1 text-sm shadow-elegant ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
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
              <ul
                className={`absolute left-full z-40 -ml-1 w-44 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-elegant ${
                  estadoUp ? "bottom-0" : "top-0"
                }`}
              >
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
