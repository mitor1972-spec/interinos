import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Trash2,
  Upload,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  CATEGORIAS,
  categoriaLabel,
  eliminarDocumento,
  formatTamano,
  listarDocumentos,
  subirDocumento,
  urlFirmada,
  aceptarDocumento,
  rechazarDocumento,
  type DocCategoria,
  type LeadDocumento,
} from "@/lib/documentos";
import {
  detectarPerfilDocumental,
  getDocumentosRequeridos,
} from "@/lib/documentosRequeridos";

interface Props {
  leadId: string;
  tipoRelacion?: string | null;
  areaSector?: string | null;
  situacionActual?: string | null;
  onChange?: (count: number) => void;
}

function clienteCesado(s: string | null | undefined): boolean {
  const v = (s ?? "").toLowerCase();
  return (
    v.includes("cesado") ||
    v.includes("cesarme") ||
    v.includes("cese") ||
    v.includes("despid") ||
    v.includes("fin de contrato") ||
    v.includes("ya no trabajo")
  );
}

export function LeadDocumentos({
  leadId,
  tipoRelacion,
  areaSector,
  situacionActual,
  onChange,
}: Props) {
  const [docs, setDocs] = useState<LeadDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoria, setCategoria] = useState<DocCategoria>("contrato");
  const [accionId, setAccionId] = useState<string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
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

  // Contador "subidos vs requeridos" para el título
  const { subidosObligatorios, totalObligatorios } = useMemo(() => {
    const perfil = detectarPerfilDocumental(tipoRelacion, areaSector);
    const cesado = clienteCesado(situacionActual);
    const requeridos = getDocumentosRequeridos(perfil).filter(
      (r) => r.required || (cesado && r.requiredSiCese),
    );
    const cats = new Set(docs.map((d) => d.categoria));
    const sub = requeridos.filter((r) => cats.has(r.categoria)).length;
    return { subidosObligatorios: sub, totalObligatorios: requeridos.length };
  }, [docs, tipoRelacion, areaSector, situacionActual]);

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

  const handleAceptar = async (doc: LeadDocumento) => {
    setAccionId(doc.id);
    const r = await aceptarDocumento(doc.id);
    setAccionId(null);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo aceptar");
      return;
    }
    toast.success("Documento aceptado");
    reload();
  };

  const handleAbrirRechazo = (doc: LeadDocumento) => {
    setRechazandoId(doc.id);
    setMotivoRechazo(doc.motivo_rechazo ?? "");
  };

  const handleConfirmarRechazo = async () => {
    if (!rechazandoId) return;
    setAccionId(rechazandoId);
    const r = await rechazarDocumento(rechazandoId, motivoRechazo);
    setAccionId(null);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo rechazar");
      return;
    }
    toast.success("Documento rechazado · email enviado al cliente");
    setRechazandoId(null);
    setMotivoRechazo("");
    reload();
  };

  return (
    <div>
      {/* Cabecera con contador */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">
          Documentos del caso
          {totalObligatorios > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {subidosObligatorios}/{totalObligatorios} obligatorios subidos
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Total archivos: <strong className="text-foreground">{docs.length}</strong>
        </div>
      </div>

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
          Aún no hay documentos subidos por el cliente ni el abogado.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {docs.map((d) => {
            const estado = (d as any).estado ?? "pendiente";
            const motivo = (d as any).motivo_rechazo ?? null;
            const revisadoEmail = (d as any).revisado_por_email ?? null;
            const procesando = accionId === d.id;
            return (
              <li key={d.id} className="p-3 text-sm">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 flex-none text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="truncate font-semibold text-foreground"
                        title={d.nombre_original}
                      >
                        {d.nombre_original}
                      </p>
                      {estado === "aceptado" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                          <CheckCircle2 className="h-3 w-3" /> Aceptado
                        </span>
                      )}
                      {estado === "rechazado" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                          <XCircle className="h-3 w-3" /> Rechazado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {categoriaLabel(d.categoria)} · {formatTamano(d.tamano_bytes)}
                      {d.subido_por_email ? ` · ${d.subido_por_email}` : ""}
                      {revisadoEmail && estado !== "pendiente" && (
                        <> · revisado por {revisadoEmail}</>
                      )}
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
                  {estado !== "aceptado" && (
                    <button
                      onClick={() => handleAceptar(d)}
                      disabled={procesando}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-success hover:bg-success/10 disabled:opacity-50"
                      aria-label="Aceptar"
                      title="Aceptar documento"
                    >
                      {procesando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  {estado !== "rechazado" && (
                    <button
                      onClick={() => handleAbrirRechazo(d)}
                      disabled={procesando}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      aria-label="Rechazar"
                      title="Rechazar documento"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(d)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    aria-label="Eliminar"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {estado === "rechazado" && motivo && rechazandoId !== d.id && (
                  <div className="mt-2 ml-7 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <div className="flex items-center gap-1 font-bold uppercase tracking-wider">
                      <AlertCircle className="h-3 w-3" /> Motivo del rechazo
                    </div>
                    <p className="mt-1 text-foreground/80">{motivo}</p>
                  </div>
                )}

                {rechazandoId === d.id && (
                  <div className="mt-3 ml-7 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-destructive">
                      Motivo del rechazo (visible para el cliente)
                    </label>
                    <textarea
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      rows={3}
                      placeholder="Ej.: La nómina está incompleta, faltan los conceptos retributivos del mes."
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-destructive focus:outline-none"
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRechazandoId(null);
                          setMotivoRechazo("");
                        }}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmarRechazo}
                        disabled={accionId === d.id || motivoRechazo.trim().length < 5}
                        className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                      >
                        {accionId === d.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Rechazar y notificar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
