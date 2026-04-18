import { useState } from "react";
import { ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import { calcularCompletitud, colorBarra } from "@/lib/completitud";
import type { Lead } from "@/lib/leads";

interface Props {
  lead: Lead;
  documentosCount: number;
}

export function CompletitudBar({ lead, documentosCount }: Props) {
  const [open, setOpen] = useState(false);
  const d = calcularCompletitud(lead, documentosCount);
  const color = colorBarra(d.total);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Completitud del caso</span>
            <span className="text-foreground">{d.total}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${color} transition-all duration-500`}
              style={{ width: `${d.total}%` }}
            />
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-none text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mt-3 grid gap-2 rounded-xl border border-border bg-background p-3 text-xs sm:grid-cols-2">
          <Block title={`Contacto · ${d.contacto.score}/${d.contacto.max}`}>
            {d.contacto.checks.map((c) => (
              <Check key={c.label} ok={c.ok} label={c.label} />
            ))}
          </Block>
          <Block title={`Caso · ${d.caso.score}/${d.caso.max}`}>
            {d.caso.checks.map((c) => (
              <Check key={c.label} ok={c.ok} label={c.label} />
            ))}
          </Block>
          <Block title={`Documentos · ${d.documentos.score}/${d.documentos.max}`}>
            <Check ok={d.documentos.ok} label={`${documentosCount} archivo(s) subido(s)`} />
          </Block>
          <Block title={`Pago · ${d.pago.score}/${d.pago.max}`}>
            <Check ok={d.pago.ok} label={d.pago.ok ? "Pago confirmado" : "Pendiente"} />
          </Block>
        </div>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-bold uppercase tracking-wider text-primary">{title}</p>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-foreground">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
