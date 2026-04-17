import type { Database } from "@/integrations/supabase/types";

export type Lead = Database["public"]["Tables"]["leads_interinos"]["Row"];
export type Semaforo = Database["public"]["Enums"]["semaforo_tipo"];
export type EstadoCaso = Database["public"]["Enums"]["estado_caso"];

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

export function semaforoConfig(s: Semaforo) {
  return SEMAFOROS.find((x) => x.value === s)!;
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
    "Administración",
    "Años",
    "Situación",
    "Urgencia",
    "Semáforo",
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
    l.administracion,
    String(l.anos_servicio),
    l.situacion_actual,
    l.urgencia ? "Sí" : "No",
    l.semaforo,
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
