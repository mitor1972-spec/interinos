import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { AbogadoLayout } from "@/components/abogado/AbogadoLayout";

export const Route = createFileRoute("/abogado/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario — Panel abogado · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AbogadoLayout title="Calendario" subtitle="Vistas y plazos. Próximamente.">
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p className="mt-3 font-semibold text-foreground">Calendario en construcción</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Plazos, vistas y citas con clientes. Estará disponible en una próxima fase.
        </p>
      </div>
    </AbogadoLayout>
  ),
});
