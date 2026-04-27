import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Scale,
  LogOut,
  Loader2,
  CheckCircle2,
  Upload,
  FileText,
  AlertCircle,
  Building2,
  CreditCard,
  ExternalLink,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listarDocumentos,
  subirDocumento,
  CATEGORIAS,
  type LeadDocumento,
  type DocCategoria,
} from "@/lib/documentos";
import {
  detectarPerfilDocumental,
  getDocumentosRequeridos,
  nombrePerfil,
  type DocRequerido,
} from "@/lib/documentosRequeridos";
import { calcularCompletitud, colorBarra } from "@/lib/completitud";
import type { Lead } from "@/lib/leads";

export const Route = createFileRoute("/cliente/")({
  head: () => ({
    meta: [
      { title: "Mi caso — Hispajuris" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClienteHome,
});

/** Heurística sencilla para detectar si el cliente está cesado a partir
 *  del campo libre `situacion_actual`. */
function clienteHaSidoCesado(situacion: string | null | undefined): boolean {
  const s = (situacion ?? "").toLowerCase();
  return (
    s.includes("cesado") ||
    s.includes("cesarme") ||
    s.includes("cese") ||
    s.includes("despid") ||
    s.includes("fin de contrato") ||
    s.includes("ya no trabajo")
  );
}

function ClienteHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [docs, setDocs] = useState<LeadDocumento[]>([]);
  const [uploadingCat, setUploadingCat] = useState<DocCategoria | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasStaffRole, setHasStaffRole] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/cliente/login" });
        return;
      }
      const uid = sess.session.user.id;
      setUserEmail(sess.session.user.email ?? null);

      // Comprobar si es admin/abogado para mostrarle atajo al panel
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      const roleList = Array.isArray(roles) ? roles.map((r) => r.role) : [];
      if (active) {
        setHasStaffRole(roleList.includes("admin") || roleList.includes("lawyer"));
      }

      const { data: leadData, error: leadErr } = await supabase
        .from("leads_interinos")
        .select("*")
        .ilike("email", sess.session.user.email ?? "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (leadErr || !leadData) {
        setLoading(false);
        return;
      }
      setLead(leadData as Lead);
      const documentos = await listarDocumentos(leadData.id);
      if (!active) return;
      setDocs(documentos);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/cliente/login" });
  };

  const handleUpload = async (categoria: DocCategoria, file: File) => {
    if (!lead) return;
    setUploadingCat(categoria);
    const res = await subirDocumento({ leadId: lead.id, file, categoria });
    setUploadingCat(null);
    if (!res.ok) {
      toast.error(res.error ?? "Error subiendo el documento");
      return;
    }
    toast.success("Documento subido correctamente");
    const documentos = await listarDocumentos(lead.id);
    setDocs(documentos);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-2xl font-bold text-primary">No encontramos tu caso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasStaffRole ? (
              <>
                La sesión activa (<strong>{userEmail}</strong>) es de un usuario
                interno. Esta sección es solo para clientes. Accede al panel
                de administración desde el botón de abajo.
              </>
            ) : (
              <>
                Verificamos el email <strong>{userEmail}</strong> pero no aparece
                en nuestro sistema. Contacta con el equipo en{" "}
                <a
                  href="mailto:info@asesor.legal"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  info@asesor.legal
                </a>
                .
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {hasStaffRole && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Shield className="h-4 w-4" /> Ir al panel admin
              </Link>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Volver al inicio
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completitud = calcularCompletitud(lead, docs.length);
  const docsByCategoria = new Map<DocCategoria, LeadDocumento[]>();
  for (const d of docs) {
    const arr = docsByCategoria.get(d.categoria) ?? [];
    arr.push(d);
    docsByCategoria.set(d.categoria, arr);
  }

  const perfil = detectarPerfilDocumental(lead.tipo_relacion, lead.area_sector);
  const cesado = clienteHaSidoCesado(lead.situacion_actual);
  const docsRequeridos = getDocumentosRequeridos(perfil);

  // Calcula obligatoriedad efectiva (incluye los condicionales si está cesado).
  const esObligatorio = (req: DocRequerido) =>
    req.required || (cesado && req.requiredSiCese === true);

  const docsObligatorios = docsRequeridos.filter(esObligatorio);
  const docsObligatoriosSubidos = docsObligatorios.filter(
    (r) => (docsByCategoria.get(r.categoria)?.length ?? 0) > 0,
  );
  const obligatoriosFaltan = docsObligatorios.filter(
    (r) => (docsByCategoria.get(r.categoria)?.length ?? 0) === 0,
  );
  const pctDocs =
    docsObligatorios.length === 0
      ? 100
      : Math.round((docsObligatoriosSubidos.length / docsObligatorios.length) * 100);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-navy text-accent">
              <Scale className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-primary">Mi caso</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-accent">
                Asesor.Legal
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {hasStaffRole && (
              <Link
                to="/admin"
                className="hidden items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 sm:inline-flex"
              >
                <Shield className="h-3.5 w-3.5" /> Panel admin
              </Link>
            )}
            <span className="hidden text-muted-foreground sm:inline">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* Cabecera estado del caso */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Caso #{lead.id.slice(0, 8)}
              </div>
              <h1 className="mt-1 text-2xl font-bold text-primary">
                Hola, {lead.nombre.split(" ")[0]}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Estado actual: <strong>{lead.estado}</strong>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Completitud
              </div>
              <div className="mt-1 text-3xl font-bold text-primary">
                {completitud.total}%
              </div>
              <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${colorBarra(completitud.total)}`}
                  style={{ width: `${completitud.total}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
            Tu caso está siendo revisado por nuestro equipo. Te contactaremos en un
            plazo de <strong>24 a 48 horas</strong>. Mientras tanto, completa la
            documentación para acelerar el proceso.
          </div>
        </div>

        {/* Bloque documentos */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-primary">Tu documentación</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Perfil detectado:{" "}
                <strong className="text-foreground">{nombrePerfil(perfil)}</strong>
                {cesado && (
                  <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                    Caso con cese
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Documentación obligatoria
              </div>
              <div className="mt-0.5 text-2xl font-bold text-primary">{pctDocs}%</div>
              <div className="text-xs text-muted-foreground">
                {docsObligatoriosSubidos.length} de {docsObligatorios.length} subidos
              </div>
            </div>
          </div>

          {/* Barra de progreso global */}
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${colorBarra(pctDocs)}`}
              style={{ width: `${pctDocs}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {obligatoriosFaltan.length === 0
              ? "Has subido todos los documentos obligatorios."
              : `Documentación ${pctDocs}% completa — faltan ${obligatoriosFaltan.length} documento${obligatoriosFaltan.length === 1 ? "" : "s"} obligatorio${obligatoriosFaltan.length === 1 ? "" : "s"}.`}
          </p>

          {/* Banner de estado */}
          <div className="mt-4">
            {obligatoriosFaltan.length === 0 ? (
              <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
                <strong>Documentación completa</strong> — tu caso está listo para
                ser revisado por el abogado. Te avisaremos en cuanto empiece la
                revisión.
              </div>
            ) : (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <strong>Faltan documentos obligatorios:</strong>{" "}
                {obligatoriosFaltan.map((d) => d.label).join(" · ")}.
              </div>
            )}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Tamaño máximo por archivo: 15 MB. Formatos admitidos: PDF, JPG, PNG, DOCX.
          </p>

          <div className="mt-3 space-y-3">
            {docsRequeridos.map((req) => {
              const subidos = docsByCategoria.get(req.categoria) ?? [];
              const hasDoc = subidos.length > 0;
              const isUploading = uploadingCat === req.categoria;
              const obligatorio = esObligatorio(req);
              return (
                <DocItem
                  key={req.categoria}
                  req={req}
                  subidos={subidos}
                  hasDoc={hasDoc}
                  isUploading={isUploading}
                  obligatorio={obligatorio}
                  onUpload={(file) => handleUpload(req.categoria, file)}
                />
              );
            })}
          </div>
        </div>

        {/* Apud Acta */}
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-card">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-primary">
                Apud Acta · Poder para abogados
                <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                  Obligatorio
                </span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Para que el abogado pueda representarte, necesitas otorgar un
                poder de representación (Apud Acta). Tienes dos opciones:
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <a
              href="https://sedejudicial.justicia.es/-/apoderamiento-apud-acta"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-border bg-card p-5 transition hover:border-accent hover:shadow-card"
            >
              <div className="flex items-center gap-2 text-2xl">🏛️</div>
              <div className="mt-2 text-sm font-bold text-primary">
                Hacerlo yo mismo gratuitamente
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Requiere certificado digital o DNI electrónico.
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                Ir a Sede Judicial <ExternalLink className="h-3 w-3" />
              </div>
            </a>

            <a
              href="https://apudacta.com/grandesdespachos/"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-accent/40 bg-accent/5 p-5 transition hover:border-accent hover:shadow-card"
            >
              <div className="flex items-center gap-2 text-2xl">💳</div>
              <div className="mt-2 text-sm font-bold text-primary">
                Servicio online sin certificado · 39€
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Cómodo y rápido, sin necesidad de certificado digital.
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                Contratar servicio <ExternalLink className="h-3 w-3" />
              </div>
            </a>
          </div>
        </div>

        {/* Pago */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-primary">Estado del pago</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lead.pago_completado
                  ? `Pago confirmado${lead.pago_fecha ? ` el ${new Date(lead.pago_fecha).toLocaleDateString("es-ES")}` : ""}.`
                  : "Aún no consta el pago de la Fase I en nuestro sistema."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Tarjeta de un documento con drag & drop
// ───────────────────────────────────────────────────────────
interface DocItemProps {
  req: DocRequerido;
  subidos: LeadDocumento[];
  hasDoc: boolean;
  isUploading: boolean;
  obligatorio: boolean;
  onUpload: (file: File) => void;
}

function DocItem({ req, subidos, hasDoc, isUploading, obligatorio, onUpload }: DocItemProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onUpload(f);
  };

  return (
    <div
      className={`rounded-xl border bg-background px-4 py-3 transition ${
        hasDoc
          ? "border-success/40 bg-success/5"
          : obligatorio
            ? "border-destructive/30"
            : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {hasDoc ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-success" />
          ) : obligatorio ? (
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-destructive" />
          ) : (
            <FileText className="mt-0.5 h-5 w-5 flex-none text-muted-foreground" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
              <span>{req.label}</span>
              {obligatorio ? (
                <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                  Obligatorio
                </span>
              ) : (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Opcional
                </span>
              )}
              {hasDoc && (
                <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                  Recibido · en revisión
                </span>
              )}
            </div>
            {req.descripcion && (
              <p className="mt-0.5 text-xs text-muted-foreground">{req.descripcion}</p>
            )}
            {hasDoc && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {subidos.length} archivo{subidos.length === 1 ? "" : "s"} subido
                {subidos.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            isUploading
              ? "pointer-events-none opacity-60 border-border bg-card text-foreground"
              : dragOver
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {isUploading ? "Subiendo..." : hasDoc ? "Añadir más" : "Subir o arrastrar"}
          <input
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {req.nota && (
        <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <strong className="font-bold">Importante:</strong> {req.nota.replace(/^Importante:\s*/i, "")}
        </div>
      )}
    </div>
  );
}

