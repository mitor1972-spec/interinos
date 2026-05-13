import { useEffect, useMemo, useState } from "react";
import { X, Send, Loader2, Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/leads";
import {
  construirBorradorEmailLead,
  enviarEmailLead,
} from "@/lib/emailLead";
import { listarDocumentos } from "@/lib/documentos";

interface Props {
  lead: Lead;
  onClose: () => void;
  onSent?: () => void;
}

export function EnviarEmailModal({ lead, onClose, onSent }: Props) {
  const [loadingAbogado, setLoadingAbogado] = useState(true);
  const [abogado, setAbogado] = useState<{
    nombre: string | null;
    email: string | null;
  } | null>(null);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);

  // Carga abogado asignado
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingAbogado(true);
      let ab: { nombre: string | null; email: string | null } | null = null;
      if (lead.asignado_a) {
        const { data } = await supabase
          .from("abogados")
          .select("nombre,email")
          .eq("id", lead.asignado_a)
          .maybeSingle();
        if (data) ab = { nombre: data.nombre, email: data.email };
      }
      const docs = await listarDocumentos(lead.id);
      if (cancelled) return;
      setAbogado(ab);
      const draft = construirBorradorEmailLead(lead, ab, docs);
      setTo(draft.to);
      setCc(draft.cc);
      setSubject(draft.subject);
      setMessage(draft.message);
      setLoadingAbogado(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  // ESC para cerrar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sending, onClose]);

  const valido = useMemo(() => {
    return (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim()) &&
      subject.trim().length > 0 &&
      message.trim().length > 0 &&
      (!cc.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cc.trim()))
    );
  }, [to, cc, subject, message]);

  const handleSend = async () => {
    if (!valido || sending) return;
    setSending(true);
    const res = await enviarEmailLead({
      leadId: lead.id,
      to: to.trim(),
      cc: cc.trim() || undefined,
      subject: subject.trim(),
      message,
    });
    setSending(false);

    if (res.success) {
      toast.success(`Email enviado correctamente a ${to.trim()}`);
      onSent?.();
      onClose();
      return;
    }

    if (res.code === "resend_not_configured") {
      toast.error(
        "El envío de emails no está conectado. Ve a Configuración → Email para activarlo.",
      );
    } else if (res.code === "resend_test_mode_restriction") {
      toast.error(
        res.error ||
          "El envío está en modo prueba: usa solo tu correo de test y sin CC.",
      );
    } else {
      toast.error(res.error || "Error al enviar. Inténtalo de nuevo.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => !sending && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-elegant animate-in zoom-in-95 duration-200"
      >
          {/* Header */}
          <header className="flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
            <div className="min-w-0">
              <h2 className="inline-flex items-center gap-2 text-lg font-bold text-primary">
                <Mail className="h-5 w-5" />
                Enviar al abogado
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Caso de <span className="font-semibold">{lead.nombre}</span> —{" "}
                {lead.provincia}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={sending}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loadingAbogado ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
              </div>
            ) : (
              <div className="space-y-3">
                {!lead.asignado_a && (
                  <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                    <span>
                      Este caso no tiene abogado asignado. Introduce el email
                      manualmente.
                    </span>
                  </div>
                )}

                <Field label="Para *">
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="abogado@despacho.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                  {abogado?.nombre && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Abogado asignado: {abogado.nombre}
                    </p>
                  )}
                </Field>

                <Field label="CC (opcional)">
                  <input
                    type="email"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="copia@ejemplo.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </Field>

                <Field label="Asunto *">
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Se añadirá automáticamente el prefijo{" "}
                    <code className="rounded bg-muted px-1">[Obadal]</code> al
                    enviar.
                  </p>
                </Field>

                <Field label="Mensaje *">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={16}
                    className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Puedes editar libremente las notas y cualquier sección
                    antes de enviar.
                  </p>
                </Field>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={!valido || sending || loadingAbogado}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Enviar email
                </>
              )}
            </button>
          </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-primary">
        {label}
      </label>
      {children}
    </div>
  );
}
