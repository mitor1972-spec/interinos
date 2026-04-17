export type Semaforo = "rojo" | "ambar" | "verde";

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
  semaforo: Semaforo;
  titulo: string;
  mensaje: string;
}

export function calcularDiagnostico(input: DiagnosticoInput): DiagnosticoResult {
  const ceseReciente =
    input.situacionActual === "Me han cesado o van a cesarme" ||
    input.situacionActual === "He participado en un proceso de estabilización y no obtuve la plaza";

  // 🔴 URGENTE
  if (input.urgencia && ceseReciente) {
    return {
      semaforo: "rojo",
      titulo: "Caso urgente",
      mensaje:
        "Tu caso presenta señales de urgencia. Conviene revisarlo cuanto antes con un especialista. Te contactaremos de forma prioritaria.",
    };
  }
  if (input.urgencia) {
    return {
      semaforo: "rojo",
      titulo: "Caso urgente",
      mensaje:
        "Has indicado que hay un plazo, recurso o juicio en marcha. Es prioritario que un especialista revise tu caso de inmediato.",
    };
  }

  const sinDocs =
    input.documentos.length === 0 ||
    (input.documentos.length === 1 && input.documentos.includes("No tengo documentación aún"));

  // 🟡 REVISIÓN RECOMENDADA
  if (input.anosServicio > 3 && (sinDocs || input.tipoRelacion === "No estoy seguro/a de mi tipo de relación")) {
    return {
      semaforo: "ambar",
      titulo: "Revisión recomendada",
      mensaje:
        "Tu situación puede tener opciones de reclamación, pero depende de factores concretos como fechas, documentación y tipo de relación. Un especialista puede orientarte sin compromiso.",
    };
  }

  // 🟢 POSIBLE CASO
  if (input.anosServicio >= 2 && !sinDocs) {
    return {
      semaforo: "verde",
      titulo: "Posible caso",
      mensaje:
        "Tu perfil encaja con los supuestos que el TJUE ha declarado relevantes. Recomendamos una revisión detallada para valorar las vías disponibles.",
    };
  }

  // Por defecto → ámbar
  return {
    semaforo: "ambar",
    titulo: "Revisión recomendada",
    mensaje:
      "Tu situación puede tener opciones de reclamación, pero conviene revisarla con un especialista para valorar todos los factores.",
  };
}
