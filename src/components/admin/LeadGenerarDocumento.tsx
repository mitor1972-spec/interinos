import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import type { Lead } from "@/lib/leads";
import { descargarInformePDF, descargarInformeWord } from "@/lib/informeCaso";

interface Props {
  lead: Lead;
}

/**
 * Bloque simple con dos botones para descargar el informe del caso
 * en PDF (vía impresión del navegador) o Word (.doc).
 * Sin plantillas, sin storage: se genera al instante con los datos actuales.
 */
export function LeadGenerarDocumento({ lead }: Props) {
  const [busy, setBusy] = useState<"pdf" | "word" | null>(null);

  async function handlePDF() {
    setBusy("pdf");
    try {
      await descargarInformePDF(lead);
      toast.success("Informe abierto. Usa Imprimir → Guardar como PDF.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el PDF");
    } finally {
      setBusy(null);
    }
  }

  async function handleWord() {
    setBusy("word");
    try {
      await descargarInformeWord(lead);
      toast.success("Informe Word descargado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el Word");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Descarga inmediata con todos los datos del caso a fecha de hoy.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handlePDF}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy === "pdf" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Descargar informe PDF
        </button>
        <button
          onClick={handleWord}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-background px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-60"
        >
          {busy === "word" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Descargar informe Word
        </button>
      </div>
    </div>
  );
}
