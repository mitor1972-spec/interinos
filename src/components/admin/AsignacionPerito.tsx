import { useEffect, useState } from "react";
import { Loader2, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatEuros } from "@/lib/leads";
import {
  crearValoracion,
  eliminarValoracion,
  estadoValoracionConfig,
  listarValoraciones,
  type Valoracion,
} from "@/lib/valoraciones";

interface PeritoOpcion {
  user_id: string;
  nombre: string;
  email: string;
}

interface Props {
  leadId: string;
  /** true sólo para admin (puede asignar/quitar). */
  canManage: boolean;
}

export function AsignacionPerito({ leadId, canManage }: Props) {
  const [loading, setLoading] = useState(true);
  const [valoracion, setValoracion] = useState<Valoracion | null>(null);
  const [peritos, setPeritos] = useState<PeritoOpcion[]>([]);
  const [seleccionado, setSeleccionado] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [vals, dirRes, rolesRes] = await Promise.all([
        listarValoraciones(leadId),
        supabase.rpc("obtener_directorio_usuarios"),
        supabase.from("user_roles").select("user_id, role").eq("role", "perito"),
      ]);
      // Última valoración (más reciente) representa la asignación.
      setValoracion(vals[0] ?? null);

      const dir = (dirRes.data ?? []) as Array<{
        user_id: string;
        email: string | null;
        nombre: string | null;
      }>;
      const dirMap = new Map(dir.map((d) => [d.user_id, d]));
      const peritoIds = new Set(
        (rolesRes.data ?? []).map((r: { user_id: string }) => r.user_id),
      );
      const lista: PeritoOpcion[] = [];
      peritoIds.forEach((uid) => {
        const info = dirMap.get(uid);
        lista.push({
          user_id: uid,
          nombre: info?.nombre || info?.email || "Perito",
          email: info?.email || "",
        });
      });
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setPeritos(lista);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const asignar = async () => {
    if (!seleccionado) return;
    const perito = peritos.find((p) => p.user_id === seleccionado);
    if (!perito) return;
    setBusy(true);
    try {
      await crearValoracion(leadId, perito.user_id, perito.email);
      toast.success(`Perito ${perito.nombre} asignado`);
      setSeleccionado("");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error asignando perito");
    } finally {
      setBusy(false);
    }
  };

  const quitar = async () => {
    if (!valoracion) return;
    if (valoracion.estado !== "borrador") {
      toast.error("Solo se puede quitar si la valoración está en borrador.");
      return;
    }
    if (!confirm("¿Quitar la asignación del perito? Se eliminará la valoración borrador.")) return;
    setBusy(true);
    try {
      await eliminarValoracion(valoracion.id);
      toast.success("Asignación eliminada");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error eliminando");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...
      </div>
    );
  }

  if (!valoracion) {
    if (!canManage) {
      return (
        <p className="text-[12px] text-muted-foreground">Sin perito asignado.</p>
      );
    }
    return (
      <div className="space-y-2">
        <select
          value={seleccionado}
          onChange={(e) => setSeleccionado(e.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[12px] font-medium text-foreground"
        >
          <option value="">— Seleccionar perito —</option>
          {peritos.map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={asignar}
          disabled={busy || !seleccionado}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserCheck className="h-3.5 w-3.5" />
          )}
          Asignar perito
        </button>
        {peritos.length === 0 && (
          <p className="text-[10px] text-muted-foreground">
            No hay peritos dados de alta. Crea uno desde Usuarios → Añadir usuario.
          </p>
        )}
      </div>
    );
  }

  const peritoInfo = peritos.find((p) => p.user_id === valoracion.perito_user_id);
  const nombre = peritoInfo?.nombre || valoracion.perito_email || "Perito";
  const cfg = estadoValoracionConfig(valoracion.estado);
  const estadoLabel =
    valoracion.estado === "borrador"
      ? valoracion.total > 0
        ? "En proceso"
        : "Pendiente"
      : valoracion.estado === "enviada"
        ? "Completada"
        : cfg.label;

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Perito
        </p>
        <p className="text-[13px] font-semibold text-foreground">{nombre}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Estado de la valoración
        </p>
        <span
          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.className}`}
        >
          {estadoLabel}
        </span>
      </div>
      {valoracion.total > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Total estimado
          </p>
          <p className="text-[14px] font-bold text-primary">
            {formatEuros(Number(valoracion.total))}
          </p>
        </div>
      )}
      {canManage && (
        <button
          type="button"
          onClick={quitar}
          disabled={busy || valoracion.estado !== "borrador"}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
          title={
            valoracion.estado !== "borrador"
              ? "Solo se puede quitar si la valoración está en borrador"
              : ""
          }
        >
          <Trash2 className="h-3.5 w-3.5" /> Quitar asignación
        </button>
      )}
    </div>
  );
}
