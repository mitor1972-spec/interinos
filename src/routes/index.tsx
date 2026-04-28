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
      { title: "Obadal · Plataforma de Reclamación para Interinos — Hispajuris" },
      {
        name: "description",
        content:
          "Empleados públicos temporales: analiza gratis tu caso de abuso de temporalidad tras la sentencia del TJUE (caso Obadal C-418/24).",
      },
      { property: "og:title", content: "Obadal · Plataforma de Reclamación para Interinos — Hispajuris" },
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
        <FormularioDiagnostico />
        <Ventajas />
        <Pricing />
        <section style={{ maxWidth: "860px", margin: "60px auto", padding: "0 24px", fontFamily: "Arial, sans-serif", color: "#2d3748", lineHeight: 1.8 }}>
          <h2 style={{ color: "#1a3a5c", fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>
            ¿Eres interino y quieres saber si puedes reclamar tras la sentencia del TJUE?
          </h2>
          <p>El <strong>Tribunal de Justicia de la Unión Europea</strong> dictó el 14 de abril de 2026 una sentencia histórica en el asunto <strong>C-418/24 (caso Obadal)</strong> que cambia completamente el panorama para miles de <strong>funcionarios interinos, personal estatutario temporal y trabajadores laborales temporales</strong> de la administración pública española.</p>
          <p>El TJUE declaró que las medidas previstas en España para sancionar el <strong>abuso de temporalidad en el empleo público</strong> no son adecuadas, efectivas ni disuasorias. En concreto, el tribunal consideró insuficientes:</p>
          <ul style={{ margin: "16px 0 16px 24px" }}>
            <li>La figura del <strong>indefinido no fijo</strong>, que perpetúa la precariedad</li>
            <li>Las <strong>indemnizaciones tasadas con doble límite máximo</strong> (20 días/año con tope de 12 mensualidades)</li>
            <li>Los <strong>procesos de estabilización</strong>, por no garantizar la plaza al afectado</li>
            <li>El régimen de <strong>responsabilidad patrimonial</strong> de las administraciones, calificado de ambiguo e imprevisible</li>
          </ul>
          <p>Esto abre nuevas vías de reclamación para empleados públicos temporales en cualquier administración: <strong>ayuntamientos, comunidades autónomas, sanidad pública, educación, universidades y administración general del Estado</strong>.</p>

          <h2 style={{ color: "#1a3a5c", fontSize: "24px", fontWeight: 700, margin: "40px 0 16px" }}>
            ¿Quién puede reclamar por abuso de temporalidad?
          </h2>
          <p>Pueden tener derecho a reclamar los empleados públicos temporales que cumplan alguna de estas condiciones:</p>
          <ul style={{ margin: "16px 0 16px 24px" }}>
            <li><strong>Funcionarios interinos</strong> con más de 3 años en una plaza vacante sin que la administración haya convocado proceso selectivo</li>
            <li><strong>Personal estatutario temporal</strong> (sanidad, educación) con nombramientos sucesivos para las mismas funciones durante años</li>
            <li><strong>Personal laboral temporal</strong> con contratos encadenados que cubren necesidades permanentes y estructurales</li>
            <li>Empleados que hayan participado en <strong>procesos de estabilización sin obtener la plaza</strong></li>
            <li>Trabajadores reconocidos como <strong>indefinidos no fijos</strong> que quieran reclamar una reparación superior</li>
            <li>Interinos que hayan sido <strong>cesados recientemente</strong> o tengan un plazo de recurso en marcha</li>
          </ul>

          <h2 style={{ color: "#1a3a5c", fontSize: "24px", fontWeight: 700, margin: "40px 0 16px" }}>
            ¿Qué se puede reclamar tras la sentencia Obadal?
          </h2>
          <p>En función del tipo de relación con la administración y de las circunstancias concretas del caso, las vías de reclamación incluyen:</p>
          <ul style={{ margin: "16px 0 16px 24px" }}>
            <li><strong>Declaración de relación laboral fija</strong> (para personal laboral temporal): la única sanción que el TJUE considera realmente eficaz</li>
            <li><strong>Estabilidad en el empleo</strong> (para funcionarios interinos y estatutarios): medida equivalente que elimine la precariedad</li>
            <li><strong>Indemnización disuasoria sin topes</strong>: equivalente a 33 días de salario por año de servicio sin el límite de 24 mensualidades que el TJUE ha declarado insuficiente</li>
            <li><strong>Indemnización por daños y perjuicios</strong>: pérdida de oportunidades profesionales, daño moral, incertidumbre y precariedad prolongada</li>
          </ul>

          <h2 style={{ color: "#1a3a5c", fontSize: "24px", fontWeight: 700, margin: "40px 0 16px" }}>
            ¿Cómo funciona el proceso de reclamación para interinos?
          </h2>
          <p>El proceso se articula en dos fases:</p>
          <p><strong>Fase I — Estudio de viabilidad y reclamación administrativa (250€ + IVA):</strong> análisis individualizado del caso, revisión de toda la documentación (contratos, nombramientos, vida laboral, resoluciones), definición de estrategia jurídica y presentación de la reclamación previa ante la administración correspondiente.</p>
          <p><strong>Fase II — Procedimiento judicial (650€ + IVA + cuota de éxito):</strong> si la administración desestima o no responde, se interpone recurso contencioso-administrativo con dirección letrada completa. La cuota de éxito es del 10% sobre la indemnización obtenida o del 20% si se reconoce una situación de estabilidad en el empleo. Solo se aplica si hay resultado favorable.</p>

          <h2 style={{ color: "#1a3a5c", fontSize: "24px", fontWeight: 700, margin: "40px 0 16px" }}>
            Documentación necesaria para reclamar como interino
          </h2>
          <p>Para iniciar el estudio de viabilidad es recomendable tener disponible:</p>
          <ul style={{ margin: "16px 0 16px 24px" }}>
            <li>Contrato(s) o nombramiento(s) como interino o personal temporal</li>
            <li>Certificado de vida laboral actualizado (SEPE)</li>
            <li>DNI por ambas caras</li>
            <li>Nóminas recientes</li>
            <li>Resolución de cese o notificación (si existe)</li>
            <li>Cualquier resolución o sentencia previa relacionada con el caso</li>
          </ul>
          <p>No es necesario tener toda la documentación para iniciar el análisis. El equipo de Hispajuris puede orientarte sobre qué documentos son imprescindibles en cada caso concreto.</p>

          <h2 style={{ color: "#1a3a5c", fontSize: "24px", fontWeight: 700, margin: "40px 0 16px" }}>
            Preguntas frecuentes sobre interinos y la sentencia Obadal
          </h2>
          <p><strong>¿La sentencia del TJUE se aplica automáticamente a todos los interinos?</strong><br />
            No. La sentencia establece que las medidas españolas son insuficientes, pero la aplicación concreta depende de cada caso: tipo de relación, administración, duración, documentación y fase en que se encuentre el procedimiento.</p>
          <p><strong>¿Cuántos años hay que llevar como interino para poder reclamar?</strong><br />
            En general se considera que la temporalidad es abusiva a partir de los 2-3 años, especialmente si cubre una necesidad permanente. Para funcionarios interinos, la permanencia en plaza vacante superior a 3 años sin convocatoria es un indicio claro de abuso.</p>
          <p><strong>¿Puedo reclamar si ya participé en un proceso de estabilización?</strong><br />
            Sí. El TJUE ha declarado expresamente que los procesos de estabilización no son una sanción adecuada al abuso de temporalidad, por lo que no impiden reclamar una indemnización u otras medidas.</p>
          <p><strong>¿Puedo reclamar si sigo trabajando como interino, sin haber sido cesado?</strong><br />
            Sí. La reclamación no requiere que haya habido cese. Se puede iniciar mientras se sigue en activo como interino o personal temporal.</p>
          <p><strong>¿Qué diferencia hay entre fijeza e indemnización?</strong><br />
            La fijeza implica el reconocimiento de una relación laboral estable o permanente. La indemnización es una compensación económica por los daños sufridos. En algunos casos se pueden combinar ambas vías o elegir la más adecuada según el tipo de relación y la administración implicada.</p>
          <p><strong>¿Qué es el Apud Acta y por qué es necesario?</strong><br />
            El Apud Acta es el poder notarial que el interino otorga al abogado para que pueda representarle. Es obligatorio para iniciar cualquier procedimiento judicial. Puede hacerse gratuitamente con certificado digital en la Sede Judicial Electrónica o mediante servicio online.</p>

          <h2 style={{ color: "#1a3a5c", fontSize: "24px", fontWeight: 700, margin: "40px 0 16px" }}>
            ¿Por qué Hispajuris y Asesor.Legal para reclamar como interino?
          </h2>
          <p>Hispajuris es un despacho especializado en derecho del empleo público con amplia experiencia en la defensa de funcionarios interinos, personal estatutario y laboral temporal frente a la administración. Junto con Asesor.Legal, la plataforma de referencia en asesoramiento jurídico online en España, hemos desarrollado esta herramienta específica para que cualquier interino pueda conocer su situación real en menos de 2 minutos, sin coste y sin compromiso.</p>
          <p>Nuestra metodología combina el análisis jurídico individualizado de cada caso con los criterios establecidos por la sentencia del TJUE, ofreciendo una valoración honesta y sin promesas de resultados.</p>
          <p style={{ marginTop: "32px", padding: "16px", background: "#f0f4f8", borderLeft: "4px solid #1a3a5c", borderRadius: "4px", fontSize: "14px", color: "#4a5568" }}>
            <strong>Aviso legal:</strong> El contenido de esta página tiene carácter informativo y no constituye asesoramiento jurídico. Cada caso requiere un análisis individualizado. Los resultados dependen de las circunstancias concretas de cada situación. Hispajuris Abogados — Asesor.Legal.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
