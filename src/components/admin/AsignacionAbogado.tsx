import { useEffect, useState } from "react";
import { Loader2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/leads";
import { listarAbogados, type AbogadoConDespacho } from "@/lib/abogados";
import { registrarCambios } from "@/lib/historial";

interface Props {
  lead: Lead;
  onSaved: (lead: Lead) => void;
  /** modo compacto: select sin label/encabezado */
  compact?: boolean;
}

export function AsignacionAbogado({ lead, onSaved, compact }: Props) {
  const [abogados, setAbogados] = useState<AbogadoConDespacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const data = await listarAbogados();
      if (!cancel) {
        setAbogados(data.filter((a) => a.activo));
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const change = async (newId: string | null) => {
    setSaving(true);
    const prev = lead.asignado_a;
    const { data, error } = await supabase
      .from("leads_interinos")
      .update({ asignado_a: newId })
      .eq("id", lead.id)
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("No se pudo reasignar: " + (error?.message ?? ""));
      return;
    }
    const labelPrev = abogados.find((a) => a.id === prev)?.nombre ?? "Sin asignar";
    const labelNew = abogados.find((a) => a.id === newId)?.nombre ?? "Sin asignar";
    await registrarCambios(lead.id, [
      { campo: "asignado_a", valor_anterior: labelPrev, valor_nuevo: labelNew },
    ]);
    toast.success(`Asignado a ${labelNew}`);
    onSaved(data);
  };

  const current = abogados.find((a) => a.id === lead.asignado_a);

  if (compact) {
    return (
      <select
        disabled={loading || saving}
        value={lead.asignado_a ?? ""}
        onChange={(e) => change(e.target.value || null)}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[160px] truncate rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-accent disabled:opacity-50"
      >
        <option value="">— Sin asignar —</option>
        {abogados.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
            {a.despachos?.nombre ? ` · ${a.despachos.nombre}` : ""}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <UserCircle2 className="h-4 w-4 flex-none text-primary" />
      <select
        disabled={loading || saving}
        value={lead.asignado_a ?? ""}
        onChange={(e) => change(e.target.value || null)}
        className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
      >
        <option value="">— Sin asignar —</option>
        {abogados.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
            {a.despachos?.nombre ? ` · ${a.despachos.nombre}` : ""}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {current && !saving && (
        <span className="text-[11px] text-muted-foreground">{current.email}</span>
      )}
    </div>
  );
}
