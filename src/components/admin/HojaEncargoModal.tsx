import { useEffect, useMemo, useState } from "react";
import { Loader2, X, FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listarExtracciones } from "@/lib/extracciones";
import { listarAbogados, type AbogadoConDespacho } from "@/lib/abogados";
import { registrarCambios } from "@/lib/historial";
import type { Lead } from "@/lib/leads";

interface Props {
  lead: Lead;
  onClose: () => void;
  onGenerated?: () => void;
}

interface DespachoCfg {
  honorarios_fase1_default: number;
  cuota_litis_default: number;
}

export function HojaEncargoModal({ lead, onClose, onGenerated }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingAbogado, setSavingAbogado] = useState(false);
  const [abogados, setAbogados] = useState<AbogadoConDespacho[]>([]);
  const [abogadoId, setAbogadoId] = useState<string>("");

  // Cliente
  const [clienteNombre, setClienteNombre] = useState(lead.nombre);
  const [clienteDni, setClienteDni] = useState("");
  const [clienteProvincia, setClienteProvincia] = useState(lead.provincia);
  const [tipoRelacion, setTipoRelacion] = useState(lead.tipo_relacion);
  const [administracion, setAdministracion] = useState(lead.administracion);
  const [anosServicio, setAnosServicio] = useState<number>(lead.anos_servicio);

  // Abogado
  const [abogadoNombre, setAbogadoNombre] = useState("");
  const [abogadoNumColegiado, setAbogadoNumColegiado] = useState("");
  const [abogadoColegio, setAbogadoColegio] = useState("");
  const [abogadoDomicilio, setAbogadoDomicilio] = useState("");
  const [abogadoNif, setAbogadoNif] = useState("");

  // Económico
  const [honorariosFase1, setHonorariosFase1] = useState<number>(250);
  const [gastosSuplidos, setGastosSuplidos] = useState<number>(0);
  const [cuotaExito, setCuotaExito] = useState<number>(10);

  const ivaFase1 = useMemo(() => Math.round(honorariosFase1 * 0.21 * 100) / 100, [honorariosFase1]);
  const subtotal = useMemo(() => honorariosFase1 + ivaFase1, [honorariosFase1, ivaFase1]);
  const total = useMemo(() => subtotal + gastosSuplidos, [subtotal, gastosSuplidos]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1. DNI desde extracciones
        const ext = await listarExtracciones(lead.id);
        const dniExt = ext.find((e) => e.categoria === "dni");
        const datos = (dniExt?.datos as Record<string, unknown> | undefined) ?? {};
        const dni = (datos.dni as string) || (datos.numero as string) || (datos.documento as string) || "";
        if (alive && dni) setClienteDni(dni);

        // 2. Configuración del despacho
        const { data: cfg } = await supabase
          .from("configuracion_despacho")
          .select("honorarios_fase1_default, cuota_litis_default")
          .maybeSingle();
        if (alive && cfg) {
          const c = cfg as DespachoCfg;
          setHonorariosFase1(Number(c.honorarios_fase1_default) || 250);
          setCuotaExito(Number(c.cuota_litis_default) || 10);
        }

        // 3. Abogados
        const list = await listarAbogados();
        if (!alive) return;
        const activos = list.filter((a) => a.activo);
        setAbogados(activos);

        // Abogado asignado al caso → preseleccionar
        const asignado =
          activos.find((a) => a.id === lead.profesional_interviniente) ||
          activos.find((a) => a.user_id === lead.asignado_a);
        if (asignado) {
          aplicarAbogado(asignado);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  function aplicarAbogado(a: AbogadoConDespacho) {
    setAbogadoId(a.id);
    setAbogadoNombre(a.nombre || "");
    setAbogadoNumColegiado((a as unknown as { num_colegiado?: string }).num_colegiado || "");
    setAbogadoColegio((a as unknown as { colegio?: string }).colegio || "");
    setAbogadoDomicilio((a as unknown as { domicilio_profesional?: string }).domicilio_profesional || "");
    setAbogadoNif((a as unknown as { nif?: string }).nif || "");
  }

  async function guardarAbogadoComoDefault() {
    if (!abogadoId) {
      toast.error("Selecciona primero un abogado");
      return;
    }
    setSavingAbogado(true);
    const { error } = await supabase
      .from("abogados")
      .update({
        nombre: abogadoNombre,
        num_colegiado: abogadoNumColegiado || null,
        colegio: abogadoColegio || null,
        domicilio_profesional: abogadoDomicilio || null,
        nif: abogadoNif || null,
      })
      .eq("id", abogadoId);
    setSavingAbogado(false);
    if (error) {
      toast.error("No se pudo guardar: " + error.message);
      return;
    }
    toast.success("Datos del abogado guardados");
  }

  async function generar() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generar-hoja-encargo", {
        body: {
          lead_id: lead.id,
          cliente_nombre: clienteNombre,
          cliente_dni: clienteDni,
          cliente_provincia: clienteProvincia,
          tipo_relacion: tipoRelacion,
          administracion,
          anos_servicio: anosServicio,
          abogado_nombre: abogadoNombre,
          abogado_colegio: abogadoColegio,
          abogado_num_colegiado: abogadoNumColegiado,
          abogado_domicilio_profesional: abogadoDomicilio,
          abogado_nif: abogadoNif,
          honorarios_fase1: honorariosFase1,
          iva_fase1: ivaFase1,
          gastos_suplidos: gastosSuplidos,
          honorarios_fase2_exito: cuotaExito,
        },
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string; base64?: string; file_name?: string };
      if (!r.ok) throw new Error(r.error || "Error generando documento");

      // Descargar
      const bytes = Uint8Array.from(atob(r.base64 || ""), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.file_name || `HojaEncargo_${clienteNombre}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Historial
      void registrarCambios(lead.id, [
        {
          campo: "documento",
          valor_anterior: null,
          valor_nuevo: `Hoja de encargo generada — ${new Date().toLocaleDateString("es-ES")}`,
        },
      ]);

      toast.success("Hoja de encargo generada y descargada");
      onGenerated?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generando documento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-elegant"
        onClick={(e) => e.stopPropagation()}
        translate="no"
      >
        <header className="flex items-center justify-between border-b border-border bg-primary px-5 py-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h2 className="text-base font-bold">Generar Hoja de Encargo</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="max-h-[calc(92vh-7rem)] space-y-5 overflow-y-auto p-5">
            <Section title="Datos del cliente">
              <Field label="Nombre" value={clienteNombre} onChange={setClienteNombre} />
              <Field label="DNI" value={clienteDni} onChange={setClienteDni} />
              <Field label="Provincia" value={clienteProvincia} onChange={setClienteProvincia} />
              <Field label="Tipo de relación" value={tipoRelacion} onChange={setTipoRelacion} />
              <Field label="Administración" value={administracion} onChange={setAdministracion} />
              <Field
                label="Años de servicio"
                type="number"
                value={String(anosServicio)}
                onChange={(v) => setAnosServicio(Number(v) || 0)}
              />
            </Section>

            <Section title="Datos del abogado">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Abogado asignado
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={abogadoId}
                  onChange={(e) => {
                    const a = abogados.find((x) => x.id === e.target.value);
                    if (a) aplicarAbogado(a);
                  }}
                >
                  <option value="">— Seleccionar —</option>
                  {abogados.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Nombre del abogado" value={abogadoNombre} onChange={setAbogadoNombre} />
              <Field label="Nº colegiado" value={abogadoNumColegiado} onChange={setAbogadoNumColegiado} />
              <Field label="Colegio de Abogados de" value={abogadoColegio} onChange={setAbogadoColegio} />
              <Field label="NIF" value={abogadoNif} onChange={setAbogadoNif} />
              <div className="sm:col-span-2">
                <Field label="Domicilio profesional" value={abogadoDomicilio} onChange={setAbogadoDomicilio} />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  onClick={guardarAbogadoComoDefault}
                  disabled={savingAbogado || !abogadoId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:opacity-50"
                >
                  {savingAbogado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Guardar datos del abogado como predeterminados
                </button>
              </div>
            </Section>

            <Section title="Económico">
              <Field
                label="Honorarios Fase I (€)"
                type="number"
                value={String(honorariosFase1)}
                onChange={(v) => setHonorariosFase1(Number(v) || 0)}
              />
              <Field label="IVA 21% (€)" value={ivaFase1.toFixed(2)} disabled />
              <Field
                label="Gastos y suplidos (€)"
                type="number"
                value={String(gastosSuplidos)}
                onChange={(v) => setGastosSuplidos(Number(v) || 0)}
              />
              <Field label="Total (€)" value={total.toFixed(2)} disabled />
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Cuota de éxito Fase II (%)
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={cuotaExito}
                  onChange={(e) => setCuotaExito(Number(e.target.value))}
                >
                  <option value={10}>10%</option>
                  <option value={20}>20%</option>
                </select>
              </div>
            </Section>
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={generar}
            disabled={busy || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generar y descargar Word
          </button>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-primary">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:bg-muted disabled:text-muted-foreground"
      />
    </div>
  );
}
