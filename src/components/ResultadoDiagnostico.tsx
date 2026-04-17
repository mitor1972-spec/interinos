import { motion } from "framer-motion";
import { ArrowRight, Phone, AlertCircle, Info, CheckCircle2, RotateCcw, XCircle, Scale } from "lucide-react";
import type { DiagnosticoResult, ResultadoTipo } from "@/lib/diagnostico";

interface ResultadoData {
  nombre: string;
  tipoRelacion: string;
  administracion: string;
  anosServicio: number;
  situacionActual: string;
  provincia: string;
  documentos: string[];
}

const config: Record<
  ResultadoTipo,
  {
    icon: typeof AlertCircle;
    label: string;
    accent: string;
    ring: string;
    soft: string;
  }
> = {
  inviable: {
    icon: XCircle,
    label: "Caso no viable",
    accent: "bg-muted text-muted-foreground",
    ring: "ring-border",
    soft: "bg-muted/40 border-border",
  },
  revision: {
    icon: Info,
    label: "Revisión recomendada",
    accent: "bg-warning text-warning-foreground",
    ring: "ring-warning/30",
    soft: "bg-warning/10 border-warning/40",
  },
  viable: {
    icon: CheckCircle2,
    label: "Buenas perspectivas",
    accent: "bg-success text-success-foreground",
    ring: "ring-success/30",
    soft: "bg-success/5 border-success/30",
  },
  urgente: {
    icon: CheckCircle2,
    label: "Buenas perspectivas",
    accent: "bg-success text-success-foreground",
    ring: "ring-success/30",
    soft: "bg-success/5 border-success/30",
  },
};

export function ResultadoDiagnostico({
  result,
  data,
  onReset,
}: {
  result: DiagnosticoResult;
  data: ResultadoData;
  onReset: () => void;
}) {
  const c = config[result.resultado];
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
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                Resultado del diagnóstico
              </p>
              <p className="text-lg font-bold leading-tight">{c.label}</p>
            </div>
            {result.esUrgente && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1 text-xs font-bold uppercase tracking-wider text-destructive-foreground shadow-sm">
                <AlertCircle className="h-3 w-3" />
                Urgente
              </span>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-7 sm:px-8">
            <h3 className="text-2xl font-bold text-primary sm:text-3xl">
              {data.nombre ? `${data.nombre.split(" ")[0]}, ` : ""}
              {result.titulo.toLowerCase()}
            </h3>
            <p className="mt-3 text-base text-foreground/80">{result.mensaje}</p>

            {result.esUrgente && result.mensajeUrgencia && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-destructive" />
                <p className="text-sm font-medium text-foreground">{result.mensajeUrgencia}</p>
              </div>
            )}

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

            {/* Qué podría reclamar — solo si NO es inviable */}
            {result.resultado !== "inviable" && result.reclamaciones.length > 0 && (
              <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Qué podrías reclamar
                  </p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/85">
                  {result.reclamaciones.map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs italic text-muted-foreground">
                  Las posibles vías se expresan en condicional. No constituyen una promesa de
                  resultado.
                </p>
              </div>
            )}

            {/* Precios — solo si se muestra el pago */}
            {result.mostrarPago && (
              <div className="mt-6 rounded-xl border border-accent/30 bg-accent-soft/40 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-accent-foreground">
                  Honorarios
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">Fase I — Estudio</p>
                    <p className="mt-0.5 text-sm text-foreground/80">
                      250 € + IVA <span className="text-muted-foreground">(302,50 € IVA incl.)</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Fase II — Reclamación</p>
                    <p className="mt-0.5 text-sm text-foreground/80">
                      650 € + IVA base + 10 % éxito indemnización / 20 % si fijeza
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  No incluye procurador, peritos ni tasas judiciales.
                </p>
              </div>
            )}

            {/* CTAs */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {result.mostrarPago && (
                <button
                  type="button"
                  onClick={() => alert("La pasarela de pago se conectará en la próxima fase.")}
                  className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-gold px-6 py-3.5 text-sm font-bold text-accent-foreground shadow-gold transition hover:scale-[1.01]"
                >
                  Iniciar Fase I — 302,50 € (IVA incl.)
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
              )}
              <a
                href="tel:668510087"
                className={`inline-flex items-center justify-center gap-2 rounded-full border border-primary px-6 py-3.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground ${
                  result.mostrarPago ? "bg-background" : "flex-1 bg-background"
                }`}
              >
                <Phone className="h-4 w-4" />
                {result.mostrarPago ? "Prefiero que me llamen" : "Llámanos: 668 510 087"}
              </a>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Este diagnóstico es orientativo y no sustituye el asesoramiento de un abogado. La
              viabilidad real depende del análisis individualizado del caso concreto, la
              documentación aportada y las circunstancias específicas de cada situación.
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
