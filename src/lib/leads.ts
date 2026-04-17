import type { Database } from "@/integrations/supabase/types";

export type Lead = Database["public"]["Tables"]["leads_interinos"]["Row"];
export type Semaforo = Database["public"]["Enums"]["semaforo_tipo"];
export type EstadoCaso = Database["public"]["Enums"]["estado_caso"];
export type Perfil = Database["public"]["Enums"]["perfil_tipo"];
export type Resultado = Database["public"]["Enums"]["resultado_viabilidad"];

export const ESTADOS: EstadoCaso[] = [
  "Nuevo",
  "En estudio",
  "Propuesta enviada",
  "Cliente",
  "Descartado",
];

export const SEMAFOROS: { value: Semaforo; label: string; emoji: string; className: string }[] = [
  { value: "rojo", label: "Urgente", emoji: "🔴", className: "bg-destructive/10 text-destructive border-destructive/30" },
  { value: "ambar", label: "Revisar", emoji: "🟡", className: "bg-warning/10 text-warning-foreground border-warning/40" },
  { value: "verde", label: "Posible", emoji: "🟢", className: "bg-success/10 text-success border-success/30" },
];

export const PERFILES: { value: Perfil; label: string; className: string }[] = [
  { value: "laboral", label: "Laboral", className: "bg-primary/10 text-primary border-primary/30" },
  { value: "funcionario", label: "Funcionario", className: "bg-accent/15 text-accent-foreground border-accent/30" },
  { value: "desconocido", label: "Sin definir", className: "bg-muted text-muted-foreground border-border" },
];

export const RESULTADOS: { value: Resultado; label: string }[] = [
  { value: "inviable", label: "No viable" },
  { value: "revision", label: "Revisión" },
  { value: "viable", label: "Viable" },
  { value: "urgente", label: "Urgente" },
];

export function semaforoConfig(s: Semaforo) {
  return SEMAFOROS.find((x) => x.value === s)!;
}

export function perfilConfig(p: Perfil) {
  return PERFILES.find((x) => x.value === p)!;
}

export function estadoBadgeClass(e: EstadoCaso): string {
  switch (e) {
    case "Nuevo":
      return "bg-primary/10 text-primary border-primary/30";
    case "En estudio":
      return "bg-warning/10 text-warning-foreground border-warning/40";
    case "Propuesta enviada":
      return "bg-accent/15 text-accent-foreground border-accent/30";
    case "Cliente":
      return "bg-success/10 text-success border-success/30";
    case "Descartado":
      return "bg-muted text-muted-foreground border-border";
  }
}

/**
 * Heurística para considerar la documentación como "completa":
 * tiene al menos contrato/nombramiento + algún documento adicional
 * (nóminas, vida laboral, resolución de cese, sentencia previa).
 */
export function docsCompletos(documentos: string[] | null): boolean {
  if (!documentos || documentos.length === 0) return false;
  const lower = documentos.map((d) => d.toLowerCase());
  if (lower.every((d) => d.includes("no tengo"))) return false;
  const hasContrato = lower.some((d) => d.includes("contrato") || d.includes("nombramiento"));
  const hasOtro = lower.some(
    (d) =>
      d.includes("vida laboral") ||
      d.includes("nómina") ||
      d.includes("nomina") ||
      d.includes("cese") ||
      d.includes("sentencia"),
  );
  return hasContrato && hasOtro;
}

export function reclamacionesPorPerfil(perfil: Perfil): string[] {
  if (perfil === "laboral") {
    return [
      "Declaración de relación laboral fija (vía principal post-TJUE)",
      "Indemnización de 33 días/año sin tope de 24 mensualidades",
      "Daños y perjuicios (pérdida de oportunidades, daño moral)",
    ];
  }
  if (perfil === "funcionario") {
    return [
      "Estabilidad en el empleo (medida equivalente a la fijeza)",
      "Indemnización disuasoria y reparadora sin los topes actuales",
      "Daños morales: incertidumbre, precariedad prolongada",
    ];
  }
  return [
    "Análisis previo del tipo de relación con la administración",
    "Posibles vías de reclamación según el resultado del análisis",
  ];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function exportLeadsToCSV(leads: Lead[]): void {
  const headers = [
    "Fecha",
    "Nombre",
    "Email",
    "Teléfono",
    "Provincia",
    "Tipo relación",
    "Perfil",
    "Administración",
    "Años",
    "Situación",
    "Urgencia",
    "Semáforo",
    "Resultado",
    "Puntuación",
    "Estado",
    "Pago",
    "Documentos",
    "Mensaje",
    "Notas",
  ];

  const rows = leads.map((l) => [
    formatDate(l.created_at),
    l.nombre,
    l.email,
    l.telefono,
    l.provincia,
    l.tipo_relacion,
    l.perfil,
    l.administracion,
    String(l.anos_servicio),
    l.situacion_actual,
    l.urgencia ? "Sí" : "No",
    l.semaforo,
    l.resultado_viabilidad,
    String(l.puntuacion_viabilidad),
    l.estado,
    l.pago_completado ? "Sí" : "No",
    (l.documentos_disponibles || []).join("; "),
    l.mensaje_libre || "",
    l.notas_abogado || "",
  ]);

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join(
    "\n",
  );

  // BOM para Excel
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-interinos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
