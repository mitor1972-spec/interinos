import type { DocCategoria } from "@/lib/documentos";

export type PerfilDocumental = "funcionario" | "estatutario" | "laboral" | "desconocido";

export interface DocRequerido {
  categoria: DocCategoria;
  label: string;
  descripcion?: string;
  required: boolean;
  /** Solo obligatorio si la persona ha sido cesada / despedida. */
  requiredSiCese?: boolean;
  /** Nota informativa adicional (renderizada bajo el campo). */
  nota?: string;
}

/**
 * Detecta el perfil documental a partir del campo libre `tipo_relacion`
 * que se guarda en `leads_interinos`. Distingue funcionario, estatutario
 * y laboral temporal — necesario para mostrar la lista de documentos
 * correcta a cada cliente.
 */
export function detectarPerfilDocumental(
  tipoRelacion: string | null | undefined,
  areaSector?: string | null,
): PerfilDocumental {
  const t = (tipoRelacion ?? "").toLowerCase();
  const a = (areaSector ?? "").toLowerCase();

  if (t.includes("estatutario")) return "estatutario";
  // Sanidad / educación pública con tipo no especificado → estatutario por defecto
  if (
    t.includes("funcionario") &&
    (a.includes("sanidad") || a.includes("educacion") || a.includes("educación"))
  ) {
    return "estatutario";
  }
  if (t.includes("funcionario")) return "funcionario";
  if (t.includes("laboral")) return "laboral";
  return "desconocido";
}

const NOTA_VIDA_LABORAL =
  "Importante: necesitamos la vida laboral que facilita tu propia Administración (la del organismo donde trabajas), no la del SEPE / Servicio de Empleo. Puedes solicitarla en el departamento de RRHH o en la sede electrónica de tu Administración.";

const DOCS_OPCIONALES_COMUNES: DocRequerido[] = [
  {
    categoria: "sentencia",
    label: "Sentencias o resoluciones previas relacionadas",
    required: false,
  },
  {
    categoria: "otro",
    label: "Comunicaciones de la Administración u otros documentos relevantes",
    required: false,
  },
];

const DOC_VIDA_LABORAL: DocRequerido = {
  categoria: "vida_laboral",
  label: "Vida laboral administrativa",
  descripcion: "Certificado de servicios prestados emitido por tu Administración.",
  required: true,
  nota: NOTA_VIDA_LABORAL,
};

const DOC_NOMINAS: DocRequerido = {
  categoria: "nomina",
  label: "Últimas 4 nóminas",
  required: true,
};

const DOC_DNI: DocRequerido = {
  categoria: "dni",
  label: "DNI por ambas caras",
  required: true,
};

const DOC_APUD_ACTA: DocRequerido = {
  categoria: "apud_acta",
  label: "Apud Acta (poder de representación)",
  descripcion:
    "Si ya lo has otorgado en sede judicial o por servicio online, súbelo aquí. Si aún no, hazlo desde la sección Apud Acta más abajo.",
  required: true,
};

/** Documentos requeridos para FUNCIONARIO INTERINO. */
const DOCS_FUNCIONARIO: DocRequerido[] = [
  {
    categoria: "contrato",
    label: "Nombramientos (todos, desde el primero)",
    descripcion: "Sube todos los nombramientos que hayas recibido a lo largo de tu relación.",
    required: true,
  },
  {
    categoria: "cese",
    label: "Resoluciones de cese (todas las que haya)",
    descripcion: "Solo si has sido cesado/a.",
    required: false,
    requiredSiCese: true,
  },
  DOC_VIDA_LABORAL,
  DOC_NOMINAS,
  DOC_DNI,
  DOC_APUD_ACTA,
];

/** Documentos requeridos para PERSONAL ESTATUTARIO TEMPORAL. */
const DOCS_ESTATUTARIO: DocRequerido[] = [
  {
    categoria: "contrato",
    label: "Nombramientos estatutarios (todos)",
    descripcion: "Eventuales, sustituciones, interinidades… súbelos todos.",
    required: true,
  },
  {
    categoria: "cese",
    label: "Resoluciones de cese",
    descripcion: "Solo si has sido cesado/a.",
    required: false,
    requiredSiCese: true,
  },
  DOC_VIDA_LABORAL,
  DOC_NOMINAS,
  DOC_DNI,
  DOC_APUD_ACTA,
];

/** Documentos requeridos para PERSONAL LABORAL TEMPORAL. */
const DOCS_LABORAL: DocRequerido[] = [
  {
    categoria: "contrato",
    label: "Contratos de trabajo (todos los sucesivos)",
    descripcion: "Sube todos los contratos encadenados que hayas firmado.",
    required: true,
  },
  {
    categoria: "cese",
    label: "Carta de despido o fin de contrato",
    descripcion: "Solo si has sido despedido/a o tu contrato ha finalizado.",
    required: false,
    requiredSiCese: true,
  },
  DOC_VIDA_LABORAL,
  DOC_NOMINAS,
  DOC_DNI,
  DOC_APUD_ACTA,
];

/** Lista por defecto cuando no podemos detectar el perfil. */
const DOCS_DESCONOCIDO: DocRequerido[] = [
  {
    categoria: "contrato",
    label: "Contrato de trabajo o nombramiento (todos)",
    required: true,
  },
  {
    categoria: "cese",
    label: "Resolución de cese / Carta de despido",
    descripcion: "Solo si has sido cesado/a o despedido/a.",
    required: false,
    requiredSiCese: true,
  },
  DOC_VIDA_LABORAL,
  DOC_NOMINAS,
  DOC_DNI,
  DOC_APUD_ACTA,
];

export function getDocumentosRequeridos(perfil: PerfilDocumental): DocRequerido[] {
  const base =
    perfil === "funcionario"
      ? DOCS_FUNCIONARIO
      : perfil === "estatutario"
        ? DOCS_ESTATUTARIO
        : perfil === "laboral"
          ? DOCS_LABORAL
          : DOCS_DESCONOCIDO;
  return [...base, ...DOCS_OPCIONALES_COMUNES];
}

export function nombrePerfil(perfil: PerfilDocumental): string {
  switch (perfil) {
    case "funcionario":
      return "Funcionario/a interino/a";
    case "estatutario":
      return "Personal estatutario temporal";
    case "laboral":
      return "Personal laboral temporal";
    default:
      return "Perfil pendiente de confirmar";
  }
}
