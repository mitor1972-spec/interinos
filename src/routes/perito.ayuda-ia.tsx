import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PeritoLayout } from "@/components/perito/PeritoLayout";

export const Route = createFileRoute("/perito/ayuda-ia")({
  head: () => ({
    meta: [
      { title: "Ayuda IA — Panel perito · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PeritoAyudaIA,
});

function PeritoAyudaIA() {
  return (
    <PeritoLayout
      title="Ayuda IA"
      subtitle="Asistente para cálculos de indemnización y baremos."
    >
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-card">
        <Sparkles className="mx-auto h-10 w-10 text-accent/60" />
        <p className="mt-3 text-sm text-muted-foreground">
          Pronto: generación automática de informes de valoración a partir de los datos del caso.
        </p>
      </div>
    </PeritoLayout>
  );
}
