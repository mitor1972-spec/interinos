import { motion } from "framer-motion";
import { ArrowRight, Phone, AlertCircle, Info, CheckCircle2, RotateCcw } from "lucide-react";
import type { DiagnosticoResult } from "@/lib/diagnostico";

interface ResultadoData {
  nombre: string;
  tipoRelacion: string;
  administracion: string;
  anosServicio: number;
  situacionActual: string;
  provincia: string;
  documentos: string[];
}

const config = {
  rojo: {
    icon: AlertCircle,
    label: "Urgente",
    accent: "bg-destructive text-destructive-foreground",
    ring: "ring-destructive/30",
    soft: "bg-destructive/5 border-destructive/30",
    dot: "bg-destructive",
  },
  ambar: {
    icon: Info,
    label: "Revisión recomendada",
    accent: "bg-warning text-warning-foreground",
    ring: "ring-warning/30",
    soft: "bg-warning/10 border-warning/40",
    dot: "bg-warning",
  },
  verde: {
    icon: CheckCircle2,
    label: "Posible caso",
    accent: "bg-success text-success-foreground",
    ring: "ring-success/30",
    soft: "bg-success/5 border-success/30",
    dot: "bg-success",
  },
} as const;

export function ResultadoDiagnostico({
  result,
  data,
  onReset,
}: {
  result: DiagnosticoResult;
  data: ResultadoData;
  onReset: () => void;
}) {
  const c = config[result.semaforo];
  const Icon = c.icon;

  return (
    <section id="resultado" className="container mx-auto mt-16 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl"
      >
        <div className={`overflow-hidden rounded-2xl border bg-card shadow-elegant ring-2 ${c.ring}`}>
          {/* Header */}
          <div className={`flex items-center gap-3 px-6 py-4 ${c.accent}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                Resultado del diagnóstico
              </p>
              <p className="text-lg font-bold leading-tight">{c.label}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-7 sm:px-8">
            <h3 className="text-2xl font-bold text-primary sm:text-3xl">
              {data.nombre ? `${data.nombre.split(" ")[0]}, ` : ""}
              {result.titulo.toLowerCase()}
            </h3>
            <p className="mt-3 text-base text-foreground/80">{result.mensaje}</p>

            {/* Resumen */}
            <div className={`mt-6 rounded-xl border p-5 ${c.soft}`}>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resumen de tu caso
              </p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <Item label="Tipo de relación" value={data.tipoRelacion} />
                <Item label="Administración" value={data.administracion} />
                <Item
                  label="Antigüedad"
                  value={`${data.anosServicio} ${data.anosServicio === 1 ? "año" : "años"}`}
                />
                <Item label="Situación actual" value={data.situacionActual} />
                <Item label="Provincia" value={data.provincia} />
                <Item
                  label="Documentación"
                  value={
                    data.documentos.length > 0
                      ? `${data.documentos.length} documento(s)`
                      : "Pendiente"
                  }
                />
              </dl>
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => alert("La pasarela de pago se conectará en la próxima fase.")}
                className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3.5 text-sm font-bold text-accent-foreground shadow-gold transition hover:scale-[1.01]"
              >
                Iniciar Fase I — 302,50€ (IVA incl.)
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
              <a
                href="tel:900105108"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-primary bg-background px-6 py-3.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                <Phone className="h-4 w-4" />
                Prefiero que me llamen
              </a>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Este diagnóstico es orientativo. No sustituye el asesoramiento de un abogado. Los
              resultados dependen del análisis individualizado del caso.
            </p>

            <button
              type="button"
              onClick={onReset}
              className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Hacer un nuevo diagnóstico
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold text-foreground">{value}</dd>
    </div>
  );
}
