import type { Lead } from "@/lib/leads";
import { PRECIO_FASE_I_EUR } from "@/lib/leads";

/**
 * Estimación media de indemnización por caso (orientativa).
 * Editable en código hasta que se mueva a una tabla de configuración.
 */
export const INDEMNIZACION_MEDIA_LABORAL_EUR = 25000;
export const INDEMNIZACION_MEDIA_FUNCIONARIO_EUR = 35000;

/** Porcentaje de cuota litis aplicado sobre la indemnización. */
export const CUOTA_LITIS_LABORAL_PCT = 10;
export const CUOTA_LITIS_FUNCIONARIO_PCT = 20;

/** Variabilidad ±% para mostrar el rango de la estimación. */
const RANGO_VARIACION_PCT = 30;

export interface MetricasFinanzas {
  casosTotales: number;
  pagadosNum: number;
  pagadosEur: number;
  pendienteCobroNum: number;
  pendienteCobroEur: number;
  ingresosConfirmadosEur: number;
  estimacionCuotaLitisMin: number;
  estimacionCuotaLitisMax: number;
  conversionPct: number;
}

export function calcularMetricasFinancieras(leads: Lead[]): MetricasFinanzas {
  const casosTotales = leads.length;
  const pagados = leads.filter((l) => l.pago_completado);
  const pagadosNum = pagados.length;

  // Importes confirmados: suma pago_importe si existe, si no usa precio Fase I
  const ingresosConfirmadosEur = pagados.reduce(
    (acc, l) => acc + (Number(l.pago_importe) || PRECIO_FASE_I_EUR),
    0,
  );
  const pagadosEur = ingresosConfirmadosEur;

  // Pendientes: leads activos sin pago
  const pendientes = leads.filter(
    (l) => !l.pago_completado && l.estado !== "Descartado",
  );
  const pendienteCobroNum = pendientes.length;
  const pendienteCobroEur = pendienteCobroNum * PRECIO_FASE_I_EUR;

  // Cuota litis: solo casos en estado Cliente (caso ganado proyectado)
  const clientes = leads.filter((l) => l.estado === "Cliente");
  let estimacionCentral = 0;
  for (const c of clientes) {
    if (c.perfil === "laboral") {
      estimacionCentral +=
        (INDEMNIZACION_MEDIA_LABORAL_EUR * CUOTA_LITIS_LABORAL_PCT) / 100;
    } else if (c.perfil === "funcionario") {
      estimacionCentral +=
        (INDEMNIZACION_MEDIA_FUNCIONARIO_EUR * CUOTA_LITIS_FUNCIONARIO_PCT) / 100;
    } else {
      // perfil desconocido: media de los dos al 15%
      estimacionCentral +=
        ((INDEMNIZACION_MEDIA_LABORAL_EUR + INDEMNIZACION_MEDIA_FUNCIONARIO_EUR) / 2) *
        0.15;
    }
  }
  const variacion = (estimacionCentral * RANGO_VARIACION_PCT) / 100;
  const estimacionCuotaLitisMin = Math.max(0, Math.round(estimacionCentral - variacion));
  const estimacionCuotaLitisMax = Math.round(estimacionCentral + variacion);

  const conversionPct =
    casosTotales > 0 ? Math.round((clientes.length / casosTotales) * 100) : 0;

  return {
    casosTotales,
    pagadosNum,
    pagadosEur,
    pendienteCobroNum,
    pendienteCobroEur,
    ingresosConfirmadosEur,
    estimacionCuotaLitisMin,
    estimacionCuotaLitisMax,
    conversionPct,
  };
}

export interface IngresosMes {
  mes: string; // "2026-01"
  label: string; // "Ene 26"
  importe: number;
  num: number;
}

export function ingresosPorMes(leads: Lead[], meses = 6): IngresosMes[] {
  const map = new Map<string, { importe: number; num: number }>();
  const hoy = new Date();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { importe: 0, num: 0 });
  }
  for (const l of leads) {
    if (!l.pago_completado) continue;
    const fecha = l.pago_fecha ?? l.created_at;
    const d = new Date(fecha);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) continue;
    const cur = map.get(key)!;
    cur.importe += Number(l.pago_importe) || PRECIO_FASE_I_EUR;
    cur.num += 1;
  }
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return Array.from(map.entries()).map(([key, v]) => {
    const [y, m] = key.split("-");
    return {
      mes: key,
      label: `${monthNames[Number(m) - 1]} ${y.slice(2)}`,
      importe: v.importe,
      num: v.num,
    };
  });
}

export interface LeadsSemana {
  semana: string; // "S12"
  inicio: string; // ISO
  total: number;
  clientes: number;
  conversionPct: number;
}

export function leadsPorSemana(leads: Lead[], semanas = 8): LeadsSemana[] {
  const result: LeadsSemana[] = [];
  const hoy = new Date();
  // Lunes de esta semana
  const dia = hoy.getDay() || 7;
  const lunesActual = new Date(hoy);
  lunesActual.setDate(hoy.getDate() - (dia - 1));
  lunesActual.setHours(0, 0, 0, 0);

  for (let i = semanas - 1; i >= 0; i--) {
    const inicio = new Date(lunesActual);
    inicio.setDate(lunesActual.getDate() - i * 7);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 7);
    const enRango = leads.filter((l) => {
      const c = new Date(l.created_at);
      return c >= inicio && c < fin;
    });
    const clientes = enRango.filter((l) => l.estado === "Cliente").length;
    result.push({
      semana: `${inicio.getDate()}/${inicio.getMonth() + 1}`,
      inicio: inicio.toISOString(),
      total: enRango.length,
      clientes,
      conversionPct: enRango.length > 0 ? Math.round((clientes / enRango.length) * 100) : 0,
    });
  }
  return result;
}

/** Compara importe ingresado este mes vs mes anterior. */
export function comparativaMensual(leads: Lead[]): {
  esteMes: number;
  mesAnterior: number;
  variacionPct: number;
} {
  const hoy = new Date();
  const inicioEste = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  let esteMes = 0;
  let mesAnterior = 0;
  for (const l of leads) {
    if (!l.pago_completado) continue;
    const f = new Date(l.pago_fecha ?? l.created_at);
    const importe = Number(l.pago_importe) || PRECIO_FASE_I_EUR;
    if (f >= inicioEste) esteMes += importe;
    else if (f >= inicioAnterior && f < inicioEste) mesAnterior += importe;
  }
  const variacionPct =
    mesAnterior === 0
      ? esteMes > 0
        ? 100
        : 0
      : Math.round(((esteMes - mesAnterior) / mesAnterior) * 100);
  return { esteMes, mesAnterior, variacionPct };
}

export function exportFinanzasCSV(leads: Lead[]): void {
  const headers = [
    "Fecha pago",
    "Nombre",
    "Email",
    "Provincia",
    "Perfil",
    "Estado",
    "Pagado",
    "Importe (€)",
    "Método",
    "Referencia",
    "Estimación cuota litis (€)",
  ];
  const rows = leads.map((l) => {
    const importe = l.pago_completado
      ? Number(l.pago_importe) || PRECIO_FASE_I_EUR
      : 0;
    let estimacion = 0;
    if (l.estado === "Cliente") {
      if (l.perfil === "laboral") {
        estimacion =
          (INDEMNIZACION_MEDIA_LABORAL_EUR * CUOTA_LITIS_LABORAL_PCT) / 100;
      } else if (l.perfil === "funcionario") {
        estimacion =
          (INDEMNIZACION_MEDIA_FUNCIONARIO_EUR * CUOTA_LITIS_FUNCIONARIO_PCT) / 100;
      }
    }
    return [
      l.pago_fecha
        ? new Date(l.pago_fecha).toLocaleDateString("es-ES")
        : l.pago_completado
          ? new Date(l.created_at).toLocaleDateString("es-ES")
          : "",
      l.nombre,
      l.email,
      l.provincia,
      l.perfil,
      l.estado,
      l.pago_completado ? "Sí" : "No",
      String(importe),
      l.metodo_pago ?? "",
      l.pago_referencia ?? "",
      String(Math.round(estimacion)),
    ];
  });
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finanzas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 100);
}
