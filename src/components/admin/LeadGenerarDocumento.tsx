import { useEffect, useState } from "react";
import { FileText, Download, Loader2, Trash2, FileType2 } from "lucide-react";
import { toast } from "sonner";
import {
  listarPlantillas,
  listarDocumentosGenerados,
  generarDocumento,
  urlDescargaDocumentoGenerado,
  eliminarDocumentoGenerado,
  type Plantilla,
  type DocumentoGenerado,
  type DocumentoGeneradoFormato,
} from "@/lib/plantillas";

interface Props {
  leadId: string;
  isAdmin: boolean;
}

export function LeadGenerarDocumento({ leadId, isAdmin }: Props) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [docs, setDocs] = useState<DocumentoGenerado[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantillaSel, setPlantillaSel] = useState<string>("");
  const [formato, setFormato] = useState<DocumentoGeneradoFormato>("docx");
  const [generando, setGenerando] = useState(false);

  async function cargar() {
    setLoading(true);
    const [pl, dg] = await Promise.all([
      listarPlantillas({ soloActivas: true }),
      listarDocumentosGenerados(leadId),
    ]);
    setPlantillas(pl);
    setDocs(dg);
    if (!plantillaSel && pl.length > 0) setPlantillaSel(pl[0].id);
    setLoading(false);
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  async function generar() {
    if (!plantillaSel) return toast.error("Selecciona una plantilla");
    setGenerando(true);
    const r = await generarDocumento({
      lead_id: leadId,
      plantilla_id: plantillaSel,
      formato,
    });
    setGenerando(false);
    if (!r.ok) return toast.error(r.error ?? "No se pudo generar");
    toast.success("Documento generado");
    void cargar();
  }

  async function descargar(d: DocumentoGenerado) {
    const url = await urlDescargaDocumentoGenerado(d.storage_path, 60);
    if (!url) return toast.error("No se pudo generar enlace");
    window.open(url, "_blank");
  }

  async function eliminar(d: DocumentoGenerado) {
    if (!confirm(`¿Eliminar "${d.nombre_archivo}"?`)) return;
    const r = await eliminarDocumentoGenerado(d.id, d.storage_path);
    if (!r.ok) return toast.error(r.error ?? "No se pudo eliminar");
    toast.success("Documento eliminado");
    void cargar();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando plantillas…</p>;
  }

  if (plantillas.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        No hay plantillas activas. Crea una en{" "}
        <code className="rounded bg-background px-1">/admin/plantillas</code>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-3">
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
          <select
            value={plantillaSel}
            onChange={(e) => setPlantillaSel(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <select
            value={formato}
            onChange={(e) => setFormato(e.target.value as DocumentoGeneradoFormato)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="docx">Word (.docx)</option>
            <option value="pdf">PDF (imprimir desde HTML)</option>
          </select>
          <button
            onClick={generar}
            disabled={generando}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-60"
          >
            {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileType2 className="h-4 w-4" />}
            {generando ? "Generando…" : "Generar"}
          </button>
        </div>
        {formato === "pdf" && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Se generará un HTML imprimible. Ábrelo y usa <strong>Imprimir → Guardar como PDF</strong>.
          </p>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay documentos generados para este caso.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {d.nombre_archivo}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {d.plantilla_nombre} · {new Date(d.created_at).toLocaleString("es-ES")}
                  {d.generado_por_email ? ` · ${d.generado_por_email}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => descargar(d)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" /> Descargar
                </button>
                {isAdmin && (
                  <button
                    onClick={() => eliminar(d)}
                    className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
