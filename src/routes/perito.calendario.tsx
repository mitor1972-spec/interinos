import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { PeritoLayout } from "@/components/perito/PeritoLayout";

export const Route = createFileRoute("/perito/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario — Panel perito · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PeritoCalendario,
});

function PeritoCalendario() {
  return (
    <PeritoLayout title="Calendario" subtitle="Próximamente.">
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-card">
        <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aquí podrás ver tus citas, plazos y vencimientos. En desarrollo.
        </p>
      </div>
    </PeritoLayout>
  );
}
