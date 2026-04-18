import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, AlertCircle, UserCog, Shield, Briefcase, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Panel · Usuarios — Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UsuariosPage,
});

interface RoleRow {
  user_id: string;
  role: "admin" | "lawyer" | "client";
  created_at: string;
}

const ROLE_META: Record<RoleRow["role"], { label: string; icon: typeof Shield; cls: string }> = {
  admin: { label: "Administrador", icon: Shield, cls: "bg-primary/10 text-primary border-primary/30" },
  lawyer: { label: "Abogado", icon: Briefcase, cls: "bg-accent/15 text-accent-foreground border-accent/30" },
  client: { label: "Cliente", icon: UserIcon, cls: "bg-muted text-muted-foreground border-border" },
};

function UsuariosPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  useEffect(() => {
    if (!session || !isAdmin) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .order("created_at", { ascending: false });
      setRoles((data ?? []) as RoleRow[]);
      setLoading(false);
    })();
  }, [session, isAdmin]);

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
      <AdminLayout title="Usuarios">
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 font-semibold text-foreground">Solo administradores</p>
          <p className="mt-1 text-sm text-muted-foreground">
            La gestión de usuarios y roles está reservada al rol admin.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Usuarios y roles"
      subtitle="Personas con acceso al sistema y permisos asignados."
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando usuarios...
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <UserCog className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-semibold text-foreground">Sin usuarios con rol asignado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Los usuarios que se registren recibirán el rol cliente automáticamente.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Usuario (ID)</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Asignado</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => {
                const meta = ROLE_META[r.role];
                const Icon = meta.icon;
                return (
                  <tr key={`${r.user_id}-${r.role}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{r.user_id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.cls}`}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("es-ES")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        La asignación y revocación de roles requiere acceso al backend. Próximamente añadiremos
        formularios para invitar usuarios y cambiar su rol desde aquí.
      </p>
    </AdminLayout>
  );
}
