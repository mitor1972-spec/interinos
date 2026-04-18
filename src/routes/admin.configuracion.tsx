import { useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2, AlertCircle, Building2, Mail, Shield, Database, Cog } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/configuracion")({
  head: () => ({
    meta: [
      { title: "Panel · Configuración — Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfiguracionPage,
});

const SECTIONS = [
  {
    icon: Building2,
    title: "Despachos y abogados",
    description: "Crear, editar y desactivar despachos colaboradores y profesionales.",
    to: "/admin/despachos",
    available: true,
  },
  {
    icon: Mail,
    title: "Notificaciones por email",
    description: "Plantillas y disparadores para nuevos leads, pagos e informes.",
    available: false,
  },
  {
    icon: Shield,
    title: "Permisos y roles",
    description: "Asignar admin, abogado, cliente y futuros roles (perito).",
    to: "/admin/usuarios",
    available: true,
  },
  {
    icon: Database,
    title: "Datos del proyecto",
    description: "Estado del backend, copias de seguridad y exportaciones.",
    available: false,
  },
  {
    icon: Cog,
    title: "Parámetros generales",
    description: "Precio Fase I, cuota litis estimada, semaforización por defecto.",
    available: false,
  },
] as const;

function ConfiguracionPage() {
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
      <AdminLayout title="Configuración">
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 font-semibold text-foreground">Solo administradores</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Configuración"
      subtitle="Centro de control del panel: despachos, notificaciones, roles y parámetros."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const card = (
            <div
              className={`group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition ${
                s.available ? "hover:border-accent hover:shadow-elegant" : "opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-bold text-primary">{s.title}</h3>
              </div>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{s.description}</p>
              <div className="mt-4">
                {s.available ? (
                  <span className="text-xs font-semibold text-accent group-hover:underline">
                    Abrir →
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Próximamente
                  </span>
                )}
              </div>
            </div>
          );
          return s.available && "to" in s && s.to ? (
            <Link key={s.title} to={s.to}>
              {card}
            </Link>
          ) : (
            <div key={s.title}>{card}</div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
