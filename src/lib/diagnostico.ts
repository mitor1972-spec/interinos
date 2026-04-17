// Lógica de evaluación de viabilidad — criterios Hispajuris
// Basada en la sentencia TJUE Obadal (C-418/24) y doctrina aplicable

export type Semaforo = "rojo" | "ambar" | "verde";
export type ResultadoTipo = "inviable" | "revision" | "viable" | "urgente";
export type Perfil = "laboral" | "funcionario" | "desconocido";

export interface DiagnosticoInput {
  tipoRelacion: string;
  administracion: string;
  anosServicio: number;
  contratosSucesivos: boolean;
  situacionActual: string;
  documentos: string[];
  urgencia: boolean;
}

export interface DiagnosticoResult {
  // Semáforo legacy (compatible con enum de Supabase: rojo|ambar|verde)
  semaforo: Semaforo;
  // Resultado nuevo extendido
  resultado: ResultadoTipo;
  perfil: Perfil;
  puntuacion: number;
  esUrgente: boolean;
  mostrarPago: boolean;
  titulo: string;
  mensaje: string;
  mensajeUrgencia?: string;
  reclamaciones: string[];
}

// ─────────────────────────────────────────────
// Detección de perfil
// ─────────────────────────────────────────────
function detectarPerfil(tipoRelacion: string): Perfil {
  const t = tipoRelacion.toLowerCase();
  if (t.includes("funcionario") || t.includes("estatutario")) return "funcionario";
  if (t.includes("laboral")) return "laboral";
  return "desconocido";
}

// ─────────────────────────────────────────────
// Detección de situaciones clave
// ─────────────────────────────────────────────
function esCese(situacion: string): boolean {
  const s = situacion.toLowerCase();
  return s.includes("cesado") || s.includes("cesarme") || s.includes("cese");
}

function esEstabilizacionSinPlaza(situacion: string): boolean {
  return situacion.toLowerCase().includes("estabilización");
}

function esIndefinidoNoFijo(situacion: string): boolean {
  return situacion.toLowerCase().includes("indefinido");
}

function tieneContratoYVidaLaboral(documentos: string[]): boolean {
  const hasContrato = documentos.some((d) => d.toLowerCase().includes("contrato") || d.toLowerCase().includes("nombramiento"));
  const hasVidaLaboral = documentos.some((d) => d.toLowerCase().includes("vida laboral"));
  return hasContrato && hasVidaLaboral;
}

function tieneAlgunDocumento(documentos: string[]): boolean {
  if (documentos.length === 0) return false;
  return !documentos.every((d) => d.toLowerCase().includes("no tengo"));
}

// ─────────────────────────────────────────────
// Cálculo de puntuación
// ─────────────────────────────────────────────
function calcularPuntuacion(input: DiagnosticoInput): { puntos: number; bloqueado: boolean } {
  let puntos = 0;

  // Años de antigüedad
  if (input.anosServicio < 2) {
    return { puntos: 0, bloqueado: true }; // INVIABLE automático
  }
  if (input.anosServicio >= 2 && input.anosServicio < 3) puntos += 1;
  else if (input.anosServicio >= 3 && input.anosServicio <= 5) puntos += 2;
  else if (input.anosServicio > 5) puntos += 3;

  // Tipo de relación
  const perfil = detectarPerfil(input.tipoRelacion);
  if (perfil === "funcionario" || perfil === "laboral") puntos += 2;
  else puntos += 1;

  // Contratos/nombramientos sucesivos
  if (input.contratosSucesivos) puntos += 2;

  // Situación actual
  if (esCese(input.situacionActual)) {
    puntos += 3;
  } else if (esEstabilizacionSinPlaza(input.situacionActual)) {
    puntos += 2;
  } else if (esIndefinidoNoFijo(input.situacionActual)) {
    puntos += 2;
  } else if (input.situacionActual.toLowerCase().includes("sigo trabajando")) {
    puntos += 2;
  }

  // Documentación
  if (tieneContratoYVidaLaboral(input.documentos)) puntos += 2;
  else if (tieneAlgunDocumento(input.documentos)) puntos += 1;

  return { puntos, bloqueado: false };
}

// ─────────────────────────────────────────────
// Reclamaciones por perfil
// ─────────────────────────────────────────────
function reclamacionesPorPerfil(perfil: Perfil): string[] {
  if (perfil === "laboral") {
    return [
      "Declaración de relación laboral fija (vía principal post-TJUE)",
      "Indemnización de 33 días/año sin tope de 24 mensualidades",
      "Indemnización por daños y perjuicios (pérdida de oportunidades, daño moral)",
    ];
  }
  if (perfil === "funcionario") {
    return [
      "Estabilidad en el empleo (medida equivalente a la fijeza)",
      "Indemnización disuasoria y reparadora sin los topes actuales (declarados insuficientes por el TJUE)",
      "Daños morales: incertidumbre, precariedad prolongada, pérdida de oportunidades",
    ];
  }
  return [
    "Análisis previo del tipo de relación con la administración",
    "Posibles vías de reclamación según el resultado del análisis",
  ];
}

// ─────────────────────────────────────────────
// Mapeo a enum Supabase (rojo|ambar|verde)
// ─────────────────────────────────────────────
function mapearSemaforo(resultado: ResultadoTipo): Semaforo {
  switch (resultado) {
    case "urgente":
      return "rojo";
    case "viable":
      return "verde";
    case "revision":
    case "inviable":
      return "ambar";
  }
}

// ─────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────
export function calcularDiagnostico(input: DiagnosticoInput): DiagnosticoResult {
  const perfil = detectarPerfil(input.tipoRelacion);
  const { puntos, bloqueado } = calcularPuntuacion(input);
  const esUrgente = input.urgencia || esCese(input.situacionActual);

  const mensajeUrgencia = esUrgente
    ? "Si hay un plazo o recurso en marcha, el tiempo es clave. Te contactamos de forma prioritaria."
    : undefined;

  let resultado: ResultadoTipo;
  let titulo: string;
  let mensaje: string;
  let mostrarPago: boolean;

  if (bloqueado || puntos <= 2) {
    resultado = "inviable";
    titulo = "Caso no viable según los datos aportados";
    mensaje =
      "Con los datos que nos has indicado, tu situación no encaja actualmente en los supuestos que la sentencia del TJUE ampara. Si crees que hay circunstancias relevantes que no has podido explicar aquí, llámanos y lo valoramos sin compromiso.";
    mostrarPago = false;
  } else if (puntos <= 5) {
    resultado = "revision";
    titulo = "Revisión recomendada";
    mensaje =
      "Tu caso puede tener opciones de reclamación, pero la viabilidad depende de factores que necesitan análisis detallado: fechas concretas, tipo de necesidad cubierta y documentación disponible. Un especialista puede orientarte sin compromiso.";
    mostrarPago = true;
  } else {
    resultado = "viable";
    titulo = "Caso con buenas perspectivas";
    mensaje =
      "Tu perfil encaja con los supuestos que el TJUE ha declarado relevantes para reclamar. La sentencia Obadal (C-418/24) abre vías reales para tu situación. Recomendamos iniciar el estudio de viabilidad cuanto antes.";
    mostrarPago = true;
  }

  // La urgencia se marca como flag aparte (no degrada un viable)
  // pero si era inviable y hay urgencia, igualmente mantenemos el resultado
  // (urgente solo eleva la prioridad de contacto, no la viabilidad jurídica)
  const resultadoFinal: ResultadoTipo = esUrgente && resultado !== "inviable" ? "urgente" : resultado;

  return {
    semaforo: mapearSemaforo(resultadoFinal),
    resultado: resultadoFinal,
    perfil,
    puntuacion: puntos,
    esUrgente,
    mostrarPago,
    titulo,
    mensaje,
    mensajeUrgencia,
    reclamaciones: reclamacionesPorPerfil(perfil),
  };
}
