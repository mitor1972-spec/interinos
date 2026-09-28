import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de privacidad · Plataforma Obadal para Interinos — Hispajuris" },
      { name: "description", content: "Cómo tratamos tus datos personales en el diagnóstico gratuito para interinos y empleados públicos temporales." },
      { property: "og:title", content: "Política de privacidad · Plataforma Obadal — Hispajuris" },
      { property: "og:description", content: "Información sobre el tratamiento de datos personales conforme al RGPD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacidad,
});

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 mb-2 text-lg font-semibold text-foreground">{children}</h2>;
}

function Privacidad() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12 text-sm leading-relaxed text-muted-foreground">
        <h1 className="text-3xl font-bold text-foreground">Política de privacidad</h1>
        <p className="mt-3">
          Información sobre el tratamiento de los datos personales que facilitas en el formulario de
          diagnóstico de esta plataforma, conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley
          Orgánica 3/2018 (LOPDGDD).
        </p>

        <H>1. Responsable del tratamiento</H>
        <ul className="list-disc pl-5">
          <li>Razón social: [pendiente de completar]</li>
          <li>NIF: [pendiente de completar]</li>
          <li>Domicilio: [pendiente de completar]</li>
          <li>Correo electrónico de contacto: [pendiente de completar]</li>
          <li>Delegado de Protección de Datos (si procede): [pendiente de completar]</li>
        </ul>

        <H>2. Finalidad</H>
        <p>
          Tratamos tus datos para realizar un estudio de viabilidad de tu posible reclamación por
          abuso de temporalidad en el empleo público, contactar contigo para informarte del
          resultado y, en su caso, derivar tu caso a un despacho de la red de abogados Hispajuris para
          su gestión. No se toman decisiones con efectos jurídicos basadas únicamente en el
          tratamiento automatizado: el diagnóstico automático es orientativo y lo revisa un
          profesional.
        </p>

        <H>3. Base jurídica</H>
        <p>
          Tu consentimiento, otorgado al marcar la casilla del formulario (art. 6.1.a RGPD), y la
          aplicación de medidas precontractuales a petición tuya (art. 6.1.b RGPD). Puedes retirar
          el consentimiento en cualquier momento sin que ello afecte a la licitud del tratamiento
          previo.
        </p>

        <H>4. Destinatarios</H>
        <p>
          Los despachos de abogados integrados en la red Hispajuris a los que, en su caso, se asigne
          tu caso según tu provincia o materia, que actuarán con deber de secreto profesional.
          También los proveedores tecnológicos que prestan servicios de alojamiento y comunicaciones
          en calidad de encargados del tratamiento. No se cederán datos a terceros salvo obligación
          legal.
        </p>

        <H>5. Conservación</H>
        <p>
          Conservaremos tus datos mientras sean necesarios para la finalidad indicada y, si no llegas
          a contratar ningún servicio, un máximo de [plazo pendiente de definir] desde tu solicitud.
          Si contratas, durante la relación profesional y los plazos legales de prescripción de
          responsabilidades.
        </p>

        <H>6. Derechos</H>
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del
          tratamiento y portabilidad escribiendo a [correo de contacto pendiente], indicando el
          derecho que ejerces y acreditando tu identidad. Si consideras que no se han atendido
          correctamente, puedes reclamar ante la Agencia Española de Protección de Datos
          (www.aepd.es).
        </p>

        <H>7. Contacto</H>
        <p>Para cualquier cuestión sobre privacidad: [correo de contacto pendiente de completar].</p>

        <p className="mt-10 rounded-md border border-border bg-muted p-3 text-xs">
          Borrador pendiente de revisión jurídica.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
