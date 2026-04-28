import { useState } from "react";
import { Loader2, CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PRECIO_FASE_I_EUR, formatEuros, type Lead } from "@/lib/leads";
import { diffLeads, registrarCambios } from "@/lib/historial";
import type { Database } from "@/integrations/supabase/types";

type MetodoPago = Database["public"]["Enums"]["metodo_pago"];

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "transferencia", label: "Transferencia" },
  { value: "bizum", label: "Bizum" },
  { value: "efectivo", label: "Efectivo" },
  { value: "stripe", label: "Stripe" },
  { value: "otro", label: "Otro" },
];

interface Props {
  lead: Lead;
  onSaved: (lead: Lead) => void;
}

/** Versión compacta del pago: una línea con toggle que guarda automáticamente. */
export function PagoManualCompact({ lead, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPago>(
    (lead.metodo_pago as MetodoPago) ?? "transferencia",
  );
  const [importe, setImporte] = useState<string>(
    lead.pago_importe ? String(lead.pago_importe) : String(PRECIO_FASE_I_EUR),
  );

  async function persist(patch: Partial<Lead>) {
    setSaving(true);
    const { data, error } = await supabase
      .from("leads_interinos")
      .update(patch)
      .eq("id", lead.id)
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("No se pudo guardar el pago");
      return;
    }
    const cambios = diffLeads(lead, data, [
      "pago_completado",
      "metodo_pago",
      "pago_fecha",
      "pago_importe",
      "pago_referencia",
    ]);
    await registrarCambios(lead.id, cambios);
    onSaved(data);
  }

  async function marcarPagado() {
    await persist({
      pago_completado: true,
      metodo_pago: metodo,
      pago_fecha: new Date().toISOString(),
      pago_importe: Number(importe) || PRECIO_FASE_I_EUR,
    });
    toast.success("Pago marcado como confirmado");
    setEditing(false);
  }

  async function marcarPendiente() {
    if (!confirm("¿Marcar el pago como pendiente?")) return;
    await persist({
      pago_completado: false,
      metodo_pago: null,
      pago_fecha: null,
      pago_importe: null,
      pago_referencia: null,
    });
    toast.success("Pago marcado como pendiente");
  }

  if (lead.pago_completado) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="font-semibold text-foreground">Pagado</span>
          {lead.pago_importe != null && (
            <span className="text-muted-foreground">· {formatEuros(Number(lead.pago_importe))}</span>
          )}
          {lead.pago_fecha && (
            <span className="text-muted-foreground">
              · {new Date(lead.pago_fecha).toLocaleDateString("es-ES")}
            </span>
          )}
        </div>
        <button
          onClick={marcarPendiente}
          disabled={saving}
          className="text-[11px] font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50"
        >
          Revertir
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">Pendiente de pago</span>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
        >
          Marcar como pagado
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as MetodoPago)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        >
          {METODOS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          min={0}
          value={importe}
          onChange={(e) => setImporte(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          placeholder="Importe €"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={marcarPagado}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          Confirmar pago
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
