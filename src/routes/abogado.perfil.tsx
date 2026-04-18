import { createFileRoute } from "@tanstack/react-router";
import { UserRound, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AbogadoLayout } from "@/components/abogado/AbogadoLayout";

export const Route = createFileRoute("/abogado/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — Panel abogado · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { session } = useAuth();
  const email = session?.user.email ?? "—";
  const nombre =
    (session?.user.user_metadata?.full_name as string) ||
    (session?.user.user_metadata?.name as string) ||
    email;

  return (
    <AbogadoLayout title="Mi perfil" subtitle="Datos de tu cuenta de abogado.">
      <div className="max-w-xl rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-bold text-primary">{nombre}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {email}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          La edición de nombre, teléfono, despacho y provincias asignadas se habilitará
          desde aquí en una próxima fase. De momento, contacta con el administrador
          para cambios en tu ficha.
        </div>
      </div>
    </AbogadoLayout>
  );
}
