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

interface RequiredDoc {
  categoria: DocCategoria | "apud_acta";
  label: string;
  required: boolean;
}

const REQUIRED_DOCS: RequiredDoc[] = [
  { categoria: "contrato", label: "Contrato o nombramiento", required: true },
  { categoria: "vida_laboral", label: "Vida laboral SEPE", required: true },
  { categoria: "nomina", label: "Últimas 3 nóminas", required: false },
  { categoria: "cese", label: "Resolución de cese (si aplica)", required: false },
  { categoria: "sentencia", label: "Sentencias previas (opcional)", required: false },
];

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
  const docsByCategoria = new Map<string, LeadDocumento[]>();
  for (const d of docs) {
    const arr = docsByCategoria.get(d.categoria) ?? [];
    arr.push(d);
    docsByCategoria.set(d.categoria, arr);
  }
  const obligatoriosFaltan = REQUIRED_DOCS.filter(
    (r) => r.required && (docsByCategoria.get(r.categoria)?.length ?? 0) === 0,
  );

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

        {/* Banner documentos */}
        <div className="mt-6">
          {obligatoriosFaltan.length > 0 ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <strong>Faltan documentos obligatorios:</strong>{" "}
              {obligatoriosFaltan.map((d) => d.label).join(", ")}.
            </div>
          ) : (
            <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
              <strong>Documentación mínima completa</strong> — lista para
              revisión por el abogado.
            </div>
          )}
        </div>

        {/* Lista de documentos */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-bold text-primary">Tus documentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube los documentos requeridos. Tamaño máximo por archivo: 15 MB.
          </p>

          <div className="mt-5 space-y-3">
            {REQUIRED_DOCS.map((req) => {
              const subidos = docsByCategoria.get(req.categoria) ?? [];
              const hasDoc = subidos.length > 0;
              const isUploading = uploadingCat === req.categoria;
              const cat = CATEGORIAS.find((c) => c.value === req.categoria);
              return (
                <div
                  key={req.categoria}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    {hasDoc ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                    ) : req.required ? (
                      <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                    ) : (
                      <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {req.label}
                        {req.required && (
                          <span className="ml-2 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                            Obligatorio
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {hasDoc
                          ? `${subidos.length} archivo${subidos.length === 1 ? "" : "s"} subido${subidos.length === 1 ? "" : "s"} · pendiente de revisión`
                          : cat
                            ? `Categoría: ${cat.label}`
                            : ""}
                      </div>
                    </div>
                  </div>
                  <label
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted ${
                      isUploading ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {hasDoc ? "Añadir más" : "Subir"}
                    <input
                      type="file"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(req.categoria as DocCategoria, f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
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
