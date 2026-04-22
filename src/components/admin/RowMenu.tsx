import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

interface MenuPosition {
  top: number;
  left: number;
}

/**
 * Menú de 3 puntos con acciones rápidas por fila de la tabla.
 * Se renderiza en un portal para evitar que los contenedores con overflow lo recorten.
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
  const [estadoUp, setEstadoUp] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setEstadoOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 208;
      const estimatedMenuHeight = menuRef.current?.offsetHeight ?? 188;
      const gap = 6;
      const shouldOpenUp = window.innerHeight - rect.bottom < estimatedMenuHeight + gap;

      const top = shouldOpenUp
        ? Math.max(8, rect.top - estimatedMenuHeight - gap)
        : Math.min(window.innerHeight - estimatedMenuHeight - 8, rect.bottom + gap);
      const left = Math.min(
        window.innerWidth - menuWidth - 8,
        Math.max(8, rect.right - menuWidth),
      );

      setMenuPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!estadoOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const submenuHeight = 200;
    setEstadoUp(window.innerHeight - rect.top < submenuHeight && rect.bottom > submenuHeight);
  }, [estadoOpen, menuPosition]);

  return (
    <>
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

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            className="fixed z-[80] w-52 overflow-visible rounded-xl border border-border bg-background py-1 text-sm shadow-elegant"
            style={{ top: menuPosition.top, left: menuPosition.left }}
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
                <ul
                  className={`absolute left-full z-[81] -ml-1 w-44 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-elegant ${
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
          </ul>,
          document.body,
        )}
    </>
  );
}
