import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, AlertTriangle, Loader2, Phone, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  calcularDiagnostico,
  type DiagnosticoInput,
  type DiagnosticoResult,
} from "@/lib/diagnostico";
import { supabase } from "@/integrations/supabase/client";
import { ResultadoDiagnostico } from "./ResultadoDiagnostico";

const TELEFONO = "668 510 087";
const TELEFONO_TEL = "668510087";

const TIPOS_RELACION = [
  "Soy funcionario/a interino/a",
  "Soy personal estatutario temporal (sanidad, educación...)",
  "Tengo contrato laboral temporal con la administración",
  "No estoy seguro/a de mi tipo de relación",
];

const ADMINISTRACIONES = [
  "Administración del Estado (AGE)",
  "Comunidad Autónoma",
  "Ayuntamiento / Entidad Local",
  "Sanidad pública",
  "Educación pública",
  "Universidad pública",
  "Otra entidad pública",
];

const SITUACIONES = [
  "Sigo trabajando como interino/temporal",
  "Me han cesado o van a cesarme",
  "He participado en un proceso de estabilización y no obtuve la plaza",
  "Me han reconocido como 'indefinido no fijo' y quiero reclamar más",
  "Otra situación",
];

const DOCUMENTOS = [
  "Contrato(s) o nombramiento(s)",
  "Nóminas",
  "Certificado de vida laboral (SEPE)",
  "Resolución de cese o notificación",
  "Sentencia o resolución previa",
  "No tengo documentación aún",
];

interface FormState {
  tipoRelacion: string;
  administracion: string;
  anosServicio: number;
  contratosSucesivos: boolean;
  situacionActual: string;
  documentos: string[];
  nombre: string;
  email: string;
  telefono: string;
  provincia: string;
  mensaje: string;
  urgencia: boolean;
  rgpd: boolean;
}

const INITIAL: FormState = {
  tipoRelacion: "",
  administracion: "",
  anosServicio: 5,
  contratosSucesivos: false,
  situacionActual: "",
  documentos: [],
  nombre: "",
  email: "",
  telefono: "",
  provincia: "",
  mensaje: "",
  urgencia: false,
  rgpd: false,
};

export function FormularioDiagnostico() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<DiagnosticoResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  // Regla 1 — Bloqueo total por antigüedad < 2 años
  const bloqueadoAntiguedad = data.anosServicio > 0 && data.anosServicio < 2;

  // Regla 2 — Puntuación calculada al final del paso 3 (antes del contacto)
  const preScore = useMemo(() => {
    if (!data.tipoRelacion || !data.administracion || !data.situacionActual) return null;
    if (bloqueadoAntiguedad) return null;
    return calcularDiagnostico({
      tipoRelacion: data.tipoRelacion,
      administracion: data.administracion,
      anosServicio: data.anosServicio,
      contratosSucesivos: data.contratosSucesivos,
      situacionActual: data.situacionActual,
      documentos: data.documentos,
      urgencia: data.urgencia,
    });
  }, [
    data.tipoRelacion,
    data.administracion,
    data.anosServicio,
    data.contratosSucesivos,
    data.situacionActual,
    data.documentos,
    data.urgencia,
    bloqueadoAntiguedad,
  ]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggleDoc = (doc: string) => {
    setData((d) => {
      const exists = d.documentos.includes(doc);
      return {
        ...d,
        documentos: exists ? d.documentos.filter((x) => x !== doc) : [...d.documentos, doc],
      };
    });
  };

  // Regla 4 — validación de campos obligatorios del paso 4
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
  const errores = {
    nombre: !data.nombre.trim(),
    email: !data.email.trim() || !emailValido,
    telefono: !data.telefono.trim(),
    provincia: !data.provincia.trim(),
    rgpd: !data.rgpd, // Regla 5
  };
  const paso4Valido =
    !errores.nombre && !errores.email && !errores.telefono && !errores.provincia && !errores.rgpd;

  const canNext = () => {
    if (step === 0) return !!data.tipoRelacion;
    if (step === 1) return !!data.administracion && !bloqueadoAntiguedad;
    if (step === 2) {
      if (!data.situacionActual) return false;
      // Regla 2: si la puntuación pre-contacto es < 3, no se llega al paso 4.
      // En su lugar, "Siguiente" pasará a mostrar resultado inviable directamente.
      return true;
    }
    if (step === 3) return paso4Valido;
    return false;
  };

  const handleNext = () => {
    if (step === 3) return;
    // Salida del paso 3: si puntuación < 3, saltamos al resultado inviable
    if (step === 2 && preScore && preScore.puntuacion < 3) {
      void persistirYMostrarResultado(true);
      return;
    }
    if (canNext()) setStep((s) => s + 1);
  };

  // Si la puntuación pre-contacto es inviable, guardamos sin datos personales
  // y mostramos el resultado directamente (sin pasar por el paso 4).
  const persistirYMostrarResultado = async (sinContacto: boolean) => {
    if (submitting) return;
    if (!sinContacto && !paso4Valido) {
      setShowErrors(true);
      return;
    }
    await handleSubmit(sinContacto);
  };

  const handleSubmit = async (sinContacto = false) => {
    if (submitting) return;
    setSubmitting(true);
    const input: DiagnosticoInput = {
      tipoRelacion: data.tipoRelacion,
      administracion: data.administracion,
      anosServicio: data.anosServicio,
      contratosSucesivos: data.contratosSucesivos,
      situacionActual: data.situacionActual,
      documentos: data.documentos,
      urgencia: data.urgencia,
    };
    const diag = calcularDiagnostico(input);

    // Si es inviable y no tenemos datos de contacto, no guardamos lead
    // (los campos nombre/email/telefono/provincia son obligatorios en BD).
    if (sinContacto) {
      setSubmitting(false);
      setResult(diag);
      setTimeout(() => {
        document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return;
    }

    const { error } = await supabase.from("leads_interinos").insert({
      nombre: data.nombre.trim(),
      email: data.email.trim(),
      telefono: data.telefono.trim(),
      provincia: data.provincia.trim(),
      tipo_relacion: data.tipoRelacion,
      administracion: data.administracion,
      anos_servicio: data.anosServicio,
      contratos_sucesivos: data.contratosSucesivos,
      situacion_actual: data.situacionActual,
      documentos_disponibles: data.documentos,
      urgencia: data.urgencia || diag.esUrgente,
      mensaje_libre: data.mensaje.trim() || null,
      semaforo: diag.semaforo,
      diagnostico_titulo: diag.titulo,
      diagnostico_mensaje: diag.mensaje,
      perfil: diag.perfil,
      puntuacion_viabilidad: diag.puntuacion,
      resultado_viabilidad: diag.resultado,
    });

    setSubmitting(false);

    if (error) {
      console.error("Error guardando lead:", error);
      toast.error(`No hemos podido guardar tu caso. Por favor, llámanos al ${TELEFONO}.`);
      return;
    }

    setResult(diag);
    toast.success("¡Diagnóstico generado! Hemos recibido tu caso.");
    setTimeout(() => {
      document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const reset = () => {
    setResult(null);
    setStep(0);
    setData(INITIAL);
    document.getElementById("diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (result) {
    return <ResultadoDiagnostico result={result} data={data} onReset={reset} />;
  }

  return (
    <section id="diagnostico" className="container mx-auto mt-24 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            Diagnóstico gratuito
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Cuéntanos tu caso en 4 pasos
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tarda menos de 2 minutos. Sin compromiso ni datos bancarios.
          </p>
        </div>

        {/* Progress */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
          <div className="mb-6 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>
              Paso {step + 1} de {totalSteps}
            </span>
            <span className="text-accent">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-gradient-gold"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="mt-8"
            >
              {step === 0 && (
                <Step
                  title="¿Cuál es tu situación actual?"
                  hint="Selecciona la opción que mejor describa tu relación laboral."
                >
                  <div className="grid gap-3">
                    {TIPOS_RELACION.map((opt) => (
                      <OptionButton
                        key={opt}
                        selected={data.tipoRelacion === opt}
                        onClick={() => update("tipoRelacion", opt)}
                      >
                        {opt}
                      </OptionButton>
                    ))}
                  </div>
                </Step>
              )}

              {step === 1 && (
                <Step title="Administración y antigüedad" hint="Indícanos dónde y cuánto tiempo.">
                  <div>
                    <label className="text-sm font-semibold text-foreground">
                      ¿En qué administración trabajas o trabajabas?
                    </label>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {ADMINISTRACIONES.map((opt) => (
                        <OptionButton
                          key={opt}
                          selected={data.administracion === opt}
                          onClick={() => update("administracion", opt)}
                          compact
                        >
                          {opt}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">
                        Años en esa situación
                      </label>
                      <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                        {data.anosServicio} {data.anosServicio === 1 ? "año" : "años"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={data.anosServicio}
                      onChange={(e) => update("anosServicio", Number(e.target.value))}
                      className="mt-3 w-full accent-[var(--color-accent)]"
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>15</span>
                      <span>30</span>
                    </div>
                  </div>

                  <div className="mt-7">
                    <Toggle
                      label="¿Has tenido varios contratos o nombramientos sucesivos?"
                      value={data.contratosSucesivos}
                      onChange={(v) => update("contratosSucesivos", v)}
                    />
                  </div>

                  {bloqueadoAntiguedad && (
                    <div className="mt-6 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-destructive/15 text-destructive">
                          <Ban className="h-5 w-5" />
                        </span>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-destructive">
                            Caso no viable actualmente
                          </h4>
                          <p className="mt-1.5 text-sm text-foreground">
                            Lo sentimos. Con menos de 2 años de antigüedad tu caso no encaja en
                            los supuestos que ampara la sentencia del TJUE actualmente.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <a
                              href={`tel:${TELEFONO_TEL}`}
                              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-card transition hover:bg-primary-light"
                            >
                              <Phone className="h-4 w-4" />
                              Llamar al {TELEFONO}
                            </a>
                            <button
                              type="button"
                              onClick={() => setStep(0)}
                              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              Volver al inicio
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Step>
              )}

              {step === 2 && (
                <Step title="Situación actual y documentación" hint="Esto nos ayuda a priorizar.">
                  <div>
                    <label className="text-sm font-semibold text-foreground">
                      ¿Cuál es tu situación ahora mismo?
                    </label>
                    <div className="mt-3 grid gap-2">
                      {SITUACIONES.map((opt) => (
                        <OptionButton
                          key={opt}
                          selected={data.situacionActual === opt}
                          onClick={() => update("situacionActual", opt)}
                          compact
                        >
                          {opt}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7">
                    <label className="text-sm font-semibold text-foreground">
                      ¿Qué documentación tienes disponible?
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">Marca todo lo que tengas.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {DOCUMENTOS.map((doc) => {
                        const checked = data.documentos.includes(doc);
                        return (
                          <button
                            key={doc}
                            type="button"
                            onClick={() => toggleDoc(doc)}
                            className={`flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${
                              checked
                                ? "border-accent bg-accent-soft/60 text-foreground"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border-2 ${
                                checked
                                  ? "border-accent bg-accent text-accent-foreground"
                                  : "border-border"
                              }`}
                            >
                              {checked && <Check className="h-3.5 w-3.5" />}
                            </span>
                            <span>{doc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Step>
              )}

              {step === 3 && (
                <Step title="Tus datos de contacto" hint="Último paso. No compartiremos tus datos.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Nombre completo *"
                      value={data.nombre}
                      onChange={(v) => update("nombre", v)}
                      error={showErrors && errores.nombre ? "Indica tu nombre" : undefined}
                    />
                    <Field
                      label="Email *"
                      type="email"
                      value={data.email}
                      onChange={(v) => update("email", v)}
                      error={
                        showErrors && errores.email
                          ? data.email.trim()
                            ? "Email no válido"
                            : "Indica tu email"
                          : undefined
                      }
                    />
                    <Field
                      label="Teléfono *"
                      type="tel"
                      value={data.telefono}
                      onChange={(v) => update("telefono", v)}
                      error={showErrors && errores.telefono ? "Indica tu teléfono" : undefined}
                    />
                    <Field
                      label="Provincia *"
                      value={data.provincia}
                      onChange={(v) => update("provincia", v)}
                      error={showErrors && errores.provincia ? "Indica tu provincia" : undefined}
                    />
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-semibold text-foreground">
                      Cuéntanos brevemente tu situación{" "}
                      <span className="font-normal text-muted-foreground">(opcional)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={data.mensaje}
                      onChange={(e) => update("mensaje", e.target.value)}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                      placeholder="Cualquier detalle relevante..."
                    />
                  </div>

                  <div className="mt-5 rounded-xl border border-warning/40 bg-warning/10 p-4">
                    <Toggle
                      label="¿Hay un plazo, recurso o juicio en marcha?"
                      icon={<AlertTriangle className="h-4 w-4 text-warning" />}
                      value={data.urgencia}
                      onChange={(v) => update("urgencia", v)}
                    />
                  </div>

                  <label
                    className={`mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                      showErrors && errores.rgpd
                        ? "border-destructive/60 bg-destructive/5"
                        : "border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={data.rgpd}
                      onChange={(e) => update("rgpd", e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--color-accent)]"
                    />
                    <span className="text-muted-foreground">
                      He leído y acepto la{" "}
                      <a href="#" className="text-primary underline">
                        política de privacidad
                      </a>{" "}
                      y el tratamiento de mis datos para recibir el diagnóstico. *
                    </span>
                  </label>
                  {showErrors && errores.rgpd && (
                    <p className="mt-2 text-xs font-semibold text-destructive">
                      Debes aceptar la política de privacidad para continuar.
                    </p>
                  )}
                </Step>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav — hidden when bloqueo is active (user has dedicated buttons) */}
          {!(step === 1 && bloqueadoAntiguedad) && (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
              <button
                type="button"
                onClick={() => { setShowErrors(false); setStep((s) => Math.max(0, s - 1)); }}
                disabled={step === 0}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </button>

              {step < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={() => canNext() && handleNext()}
                  disabled={!canNext()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => persistirYMostrarResultado(false)}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-7 py-3 text-sm font-bold text-accent-foreground shadow-gold transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Ver mi diagnóstico
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------- subcomponents -------------------- */

function Step({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xl font-bold text-primary sm:text-2xl">{title}</h3>
      {hint && <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
  compact = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-3 rounded-xl border-2 ${
        compact ? "p-3" : "p-4"
      } text-left text-sm font-medium transition ${
        selected
          ? "border-accent bg-accent-soft/60 text-foreground shadow-card"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40"
      }`}
    >
      <span>{children}</span>
      <span
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition ${
          selected ? "border-accent bg-accent" : "border-border"
        }`}
      >
        {selected && <Check className="h-3 w-3 text-accent-foreground" />}
      </span>
    </button>
  );
}

function Toggle({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full transition ${
          value ? "bg-accent" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`mt-1.5 w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 ${
          error
            ? "border-destructive focus:border-destructive focus:ring-destructive/30"
            : "border-border focus:border-accent focus:ring-accent/30"
        }`}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-destructive">{error}</span>}
    </label>
  );
}
