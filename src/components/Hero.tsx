import { motion } from "framer-motion";
import { Phone, ArrowRight, ShieldCheck } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
      {/* decorative */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-primary-light/40 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pb-28 lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            TJUE C-418/24 · Caso Obadal · 14 abril 2026
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            ¿Llevas años como interino? El{" "}
            <span className="text-accent">Tribunal Europeo</span> acaba de darte la razón.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-primary-foreground/80 sm:text-lg">
            La sentencia del TJUE declara insuficientes las medidas españolas frente al abuso de
            temporalidad en la administración pública. Analiza tu caso ahora,{" "}
            <strong className="text-primary-foreground">gratis y sin compromiso</strong>.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#diagnostico"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-7 py-3.5 text-base font-bold text-accent-foreground shadow-gold transition hover:scale-[1.02] sm:w-auto"
            >
              Analizar mi caso gratis
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
            <a
              href="tel:900105108"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/5 px-7 py-3.5 text-base font-semibold text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/10 sm:w-auto"
            >
              <Phone className="h-4 w-4" />
              Llamar ahora: 900 105 108
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-primary-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Sin compromiso
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Diagnóstico en 2 minutos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Equipo especializado
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
