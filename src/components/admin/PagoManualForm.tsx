import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PRECIO_FASE_I_EUR, type Lead } from "@/lib/leads";
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

function toDateInput(iso: string | null): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(iso).toISOString().slice(0, 10);
}

export function PagoManualForm({ lead, onSaved }: Props) {
  const [pagado, setPagado] = useState<boolean>(!!lead.pago_completado);
  const [metodo, setMetodo] = useState<MetodoPago>(
    (lead.metodo_pago as MetodoPago) ?? "transferencia",
  );
  const [fecha, setFecha] = useState<string>(toDateInput(lead.pago_fecha));
  const [importe, setImporte] = useState<string>(
    lead.pago_importe ? String(lead.pago_importe) : String(PRECIO_FASE_I_EUR),
  );
  const [referencia, setReferencia] = useState<string>(lead.pago_referencia ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const patch = {
      pago_completado: pagado,
      metodo_pago: pagado ? metodo : null,
      pago_fecha: pagado ? new Date(fecha).toISOString() : null,
      pago_importe: pagado ? Number(importe) || 0 : null,
      pago_referencia: pagado ? referencia.trim() || null : null,
    };
    const { data, error } = await supabase
      .from("leads_interinos")
      .update(patch)
      .eq("id", lead.id)
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("No se pudo guardar el pago: " + (error?.message ?? ""));
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
    toast.success("Pago actualizado");
    onSaved(data);
  };

  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <input
          type="checkbox"
          checked={pagado}
          onChange={(e) => setPagado(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-accent"
        />
        Pago confirmado
      </label>

      {pagado && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Método de pago">
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as MetodoPago)}
              className={inputCls}
            >
              {METODOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha del pago">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Importe (€)">
            <input
              type="number"
              step="0.01"
              min={0}
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Referencia (opcional)">
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Nº transferencia, concepto..."
              className={inputCls}
            />
          </Field>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Guardar pago
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
