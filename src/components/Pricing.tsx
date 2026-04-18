import { Check, ArrowRight } from "lucide-react";

export function Pricing() {
  return (
    <section id="precios" className="relative mt-20 px-4 sm:mt-24 sm:px-6">
      <div className="container mx-auto">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Precios claros y sin sorpresas
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Te ofrecemos un precio especial para interinos, sin sorpresas, todo incluido.
            Aprovecha ahora y benefíciate de esta resolución lo antes posible.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* FASE I */}
          <div className="relative rounded-2xl border border-border bg-card p-7 shadow-elegant ring-1 ring-accent/20 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                Fase I
              </span>
              <span className="font-medium text-muted-foreground text-sm">Más contratada</span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-primary">
              Estudio + Reclamación administrativa
            </h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-primary">250€</span>
              <span className="text-sm text-muted-foreground">+ IVA</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">302,50€ total (IVA incluido)</p>

            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Análisis completo de tu caso",
                "Revisión de toda tu documentación",
                "Estrategia jurídica personalizada",
                "Redacción y presentación de reclamación administrativa",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-accent" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <a
              href="#diagnostico"
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3 text-sm font-bold text-accent-foreground shadow-gold transition hover:scale-[1.01]"
            >
              Contratar Fase I
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* FASE II */}
          <div className="relative rounded-2xl border border-border bg-card p-7 shadow-card sm:p-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                Fase II
              </span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary text-sm">
                Solo si es necesario
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-primary">Procedimiento judicial</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-primary">650€</span>
              <span className="text-sm text-muted-foreground">+ IVA · base</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">786,50€ total (IVA incluido)</p>

            <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                + Cuota de éxito
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
                  <span>
                    <strong>10% + IVA</strong> sobre indemnización obtenida
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
                  <span>
                    <strong>20% + IVA</strong> si se reconoce estabilidad en el empleo
                  </span>
                </li>
              </ul>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No incluye: procurador, peritos, tasas judiciales.
            </p>

            <a
              href="tel:668510087"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary bg-background px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              Más información
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-muted-foreground">
          Los honorarios orientativos se confirman tras el análisis del caso. La cuota de éxito solo
          aplica si hay resultado favorable.
        </p>
      </div>
    </section>
  );
}
