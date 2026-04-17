import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/Hero";
import { Pricing } from "@/components/Pricing";
import { Ventajas } from "@/components/Ventajas";
import { FormularioDiagnostico } from "@/components/FormularioDiagnostico";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reclama Tu Plaza — Hispajuris · Asesor.Legal" },
      {
        name: "description",
        content:
          "Empleados públicos temporales: analiza gratis tu caso de abuso de temporalidad tras la sentencia del TJUE (caso Obadal C-418/24).",
      },
      { property: "og:title", content: "Reclama Tu Plaza — Hispajuris · Asesor.Legal" },
      {
        property: "og:description",
        content:
          "Diagnóstico gratuito en 2 minutos para interinos, estatutarios temporales y laborales temporales del sector público.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Pricing />
        <Ventajas />
        <FormularioDiagnostico />
      </main>
      <SiteFooter />
    </div>
  );
}
