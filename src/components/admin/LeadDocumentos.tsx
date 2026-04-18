import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  CATEGORIAS,
  categoriaLabel,
  eliminarDocumento,
  formatTamano,
  listarDocumentos,
  subirDocumento,
  urlFirmada,
  type DocCategoria,
  type LeadDocumento,
} from "@/lib/documentos";

interface Props {
  leadId: string;
  onChange?: (count: number) => void;
}

export function LeadDocumentos({ leadId, onChange }: Props) {
  const [docs, setDocs] = useState<LeadDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoria, setCategoria] = useState<DocCategoria>("contrato");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setLoading(true);
    const data = await listarDocumentos(leadId);
    setDocs(data);
    setLoading(false);
    onChange?.(data.length);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let okCount = 0;
    for (const file of Array.from(files)) {
      const res = await subirDocumento({ leadId, file, categoria });
      if (res.ok) okCount++;
      else toast.error(`${file.name}: ${res.error}`);
    }
    setUploading(false);
    if (okCount > 0) toast.success(`${okCount} archivo(s) subido(s)`);
    if (fileRef.current) fileRef.current.value = "";
    reload();
  };

  const handleDelete = async (doc: LeadDocumento) => {
    if (!confirm(`¿Eliminar "${doc.nombre_original}"?`)) return;
    const res = await eliminarDocumento(doc);
    if (!res.ok) {
      toast.error("No se pudo eliminar: " + res.error);
      return;
    }
    toast.success("Documento eliminado");
    reload();
  };

  const handleOpen = async (doc: LeadDocumento) => {
    const url = await urlFirmada(doc.storage_path, 120);
    if (!url) {
      toast.error("No se pudo abrir el archivo");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-background p-3">
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as DocCategoria)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground focus:border-accent focus:outline-none"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? "Subiendo..." : "Subir archivo"}
        </button>
        <span className="text-[11px] text-muted-foreground">Máx 15 MB · privado</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          Aún no hay documentos subidos por el abogado.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
              <FileText className="h-4 w-4 flex-none text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground" title={d.nombre_original}>
                  {d.nombre_original}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {categoriaLabel(d.categoria)} · {formatTamano(d.tamano_bytes)}
                  {d.subido_por_email ? ` · ${d.subido_por_email}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleOpen(d)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                aria-label="Abrir"
                title="Abrir"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(d)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
                aria-label="Eliminar"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
