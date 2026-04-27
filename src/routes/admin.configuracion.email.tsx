import { useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Loader2,
  AlertCircle,
  Mail,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/configuracion/email")({
  head: () => ({
    meta: [
      { title: "Panel · Configuración de Email — Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfiguracionEmailPage,
});

function ConfiguracionEmailPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }
  if (!session) return null;

  if (!isAdmin) {
    return (
      <AdminLayout title="Configuración de Email">
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 font-semibold text-foreground">Solo administradores</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Configuración de Email"
      subtitle="Cómo se envían los emails de la plataforma a abogados y clientes."
    >
      <div className="mb-4">
        <Link
          to="/admin/configuracion"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> Volver a Configuración
        </Link>
      </div>

      <div className="grid gap-4">
        {/* Estado del envío */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-primary">
                Servicio de envío
              </h3>
              <p className="text-xs text-muted-foreground">
                Resend (vía Lovable Cloud)
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              <span>
                <strong>Configuración pendiente.</strong> Para que los emails
                salgan de verdad necesitas conectar Resend desde Lovable y
                añadir la API key. Mientras tanto, el botón "Enviar al abogado"
                ya muestra el modal con el borrador, pero el envío fallará con
                un aviso claro.
              </span>
            </p>
          </div>
        </section>

        {/* Pasos */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 text-sm font-bold text-primary">
            Pasos para activar el envío real
          </h3>
          <ol className="space-y-3 text-sm text-foreground">
            <Paso n={1} title="Crea una cuenta en Resend">
              Entra en{" "}
              <a
                href="https://resend.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
              >
                resend.com <ExternalLink className="h-3 w-3" />
              </a>{" "}
              y crea una cuenta gratuita. Permite enviar 100 emails/día sin
              configurar dominio.
            </Paso>
            <Paso n={2} title="(Opcional) Verifica hispajuris.es">
              En Resend → Domains → Add Domain, añade{" "}
              <code className="rounded bg-muted px-1">hispajuris.es</code> y
              copia los registros DNS que indica. Cuando esté verificado,
              podrás enviar desde{" "}
              <code className="rounded bg-muted px-1">
                empleopublico@hispajuris.es
              </code>
              . Hasta entonces, los emails saldrán desde{" "}
              <code className="rounded bg-muted px-1">
                onboarding@resend.dev
              </code>{" "}
              con <em>Reply-to</em> a empleopublico@hispajuris.es.
            </Paso>
            <Paso n={3} title="Genera una API key en Resend">
              En Resend → API Keys → Create API Key. Cópiala (empieza por{" "}
              <code className="rounded bg-muted px-1">re_...</code>).
            </Paso>
            <Paso n={4} title="Conéctalo en Lovable Cloud">
              Abre <strong>Connectors</strong> en la barra lateral de Lovable
              y conecta <strong>Resend</strong>. Cuando te pida la API key,
              pega la que generaste. Eso es todo: el botón "Enviar al
              abogado" empezará a enviar inmediatamente.
            </Paso>
          </ol>
        </section>

        {/* Datos remitente */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 text-sm font-bold text-primary">
            Configuración del remitente
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Dato label="From por defecto">
              Plataforma Obadal — Hispajuris &lt;notificaciones@asesor.legal&gt;
              <p className="mt-1 text-[11px] text-muted-foreground">
                Dominio <code className="rounded bg-muted px-1">asesor.legal</code> verificado en Resend.
              </p>
            </Dato>
            <Dato label="Reply-to">empleopublico@hispajuris.es</Dato>
            <Dato label="Prefijo de asunto">
              <code className="rounded bg-muted px-1">[Obadal]</code>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Se añade automáticamente a todos los emails enviados desde la
                plataforma.
              </p>
            </Dato>
            <Dato label="Registro">
              <span className="inline-flex items-center gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3 text-success" /> Cada envío
                queda en el historial del caso
              </span>
            </Dato>
          </dl>
        </section>

        {/* Por qué no SMTP */}
        <section className="rounded-2xl border border-dashed border-border bg-muted/40 p-5">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
            <Info className="h-4 w-4" /> ¿Por qué no SMTP directo de
            hispajuris.es?
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            El backend de la app no permite conexiones SMTP salientes (puertos
            587/465 bloqueados en el entorno serverless). Por eso usamos un
            proveedor HTTP como Resend, que además mejora la entregabilidad y
            evita que los emails caigan en spam. El remitente visible puede
            seguir siendo <code className="rounded bg-muted px-1">
              empleopublico@hispajuris.es
            </code>{" "}
            una vez verificado el dominio.
          </p>
        </section>
      </div>
    </AdminLayout>
  );
}

function Paso({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function Dato({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">
        {children}
      </dd>
    </div>
  );
}
