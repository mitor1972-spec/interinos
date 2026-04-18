import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AbogadoLayout } from "@/components/abogado/AbogadoLayout";

export const Route = createFileRoute("/abogado/ayuda-ia")({
  head: () => ({
    meta: [
      { title: "Ayuda IA — Panel abogado · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AbogadoLayout
      title="Ayuda IA"
      subtitle="Asistente para redacción y análisis sobre tus casos."
    >
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-accent/70" />
        <p className="mt-3 font-semibold text-foreground">Asistente IA en preparación</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pronto podrás generar borradores, resúmenes y argumentaciones
          basados solo en los datos de tus casos asignados.
        </p>
      </div>
    </AbogadoLayout>
  ),
});
