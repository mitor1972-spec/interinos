import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { PeritoLayout } from "@/components/perito/PeritoLayout";

export const Route = createFileRoute("/perito/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — Panel perito · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PeritoPerfil,
});

function PeritoPerfil() {
  const { session } = useAuth();
  return (
    <PeritoLayout title="Mi perfil" subtitle="Datos de tu cuenta.">
      <div className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Email
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {session?.user.email ?? "—"}
        </p>
      </div>
    </PeritoLayout>
  );
}
