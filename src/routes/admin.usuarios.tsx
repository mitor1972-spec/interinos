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

type Role = "admin" | "lawyer" | "client";

interface RoleRow {
  user_id: string;
  role: Role;
  created_at: string;
}

interface DirectorioRow {
  user_id: string;
  email: string | null;
  nombre: string | null;
}

interface UsuarioFila {
  user_id: string;
  nombre: string;
  email: string;
  roles: Role[];
  created_at: string;
}

const ROLE_META: Record<Role, { label: string; icon: typeof Shield; cls: string }> = {
  admin: { label: "Administrador", icon: Shield, cls: "bg-primary/10 text-primary border-primary/30" },
  lawyer: { label: "Abogado", icon: Briefcase, cls: "bg-accent/15 text-accent-foreground border-accent/30" },
  client: { label: "Cliente", icon: UserIcon, cls: "bg-muted text-muted-foreground border-border" },
};

function UsuariosPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [filas, setFilas] = useState<UsuarioFila[]>([]);
  const [tab, setTab] = useState<"equipo" | "clientes">("equipo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  useEffect(() => {
    if (!session || !isAdmin) return;
    (async () => {
      setLoading(true);
      const [rolesRes, dirRes] = await Promise.all([
        supabase
          .from("user_roles")
          .select("user_id, role, created_at")
          .order("created_at", { ascending: false }),
        supabase.rpc("obtener_directorio_usuarios"),
      ]);

      const roles = (rolesRes.data ?? []) as RoleRow[];
      const dir = (dirRes.data ?? []) as DirectorioRow[];
      const dirMap = new Map(dir.map((d) => [d.user_id, d]));

      // Agrupar roles por user_id (un usuario puede tener varios roles)
      const userMap = new Map<string, UsuarioFila>();
      for (const r of roles) {
        const info = dirMap.get(r.user_id);
        const existing = userMap.get(r.user_id);
        if (existing) {
          if (!existing.roles.includes(r.role)) existing.roles.push(r.role);
        } else {
          userMap.set(r.user_id, {
            user_id: r.user_id,
            nombre: info?.nombre || info?.email || "(sin nombre)",
            email: info?.email || "—",
            roles: [r.role],
            created_at: r.created_at,
          });
        }
      }
      setFilas(Array.from(userMap.values()));
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

  const equipo = filas.filter((f) => f.roles.some((r) => r === "admin" || r === "lawyer"));
  const clientes = filas.filter((f) => f.roles.includes("client") && !f.roles.some((r) => r === "admin" || r === "lawyer"));
  const visibles = tab === "equipo" ? equipo : clientes;

  return (
    <AdminLayout
      title="Usuarios y roles"
      subtitle="Personas con acceso al sistema y permisos asignados."
    >
      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-xl border border-border bg-muted/40 p-1">
        {(["equipo", "clientes"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              tab === t
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "equipo" ? `Equipo (${equipo.length})` : `Clientes (${clientes.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando usuarios...
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <UserCog className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-semibold text-foreground">
            {tab === "equipo" ? "Sin miembros del equipo" : "Sin clientes registrados"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Alta</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => (
                <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-semibold text-foreground">{u.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => {
                        const meta = ROLE_META[r];
                        const Icon = meta.icon;
                        return (
                          <span
                            key={r}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.cls}`}
                          >
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("es-ES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Para añadir nuevos usuarios o cambiar roles desde el panel, lanzaremos en la siguiente fase
        el formulario de alta y la ficha editable. De momento puedes crear cuentas desde el backend.
      </p>
    </AdminLayout>
  );
}
