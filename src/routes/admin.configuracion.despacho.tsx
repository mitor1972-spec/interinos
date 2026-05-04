import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2, Save, Upload, ArrowLeft, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/configuracion/despacho")({
  head: () => ({
    meta: [
      { title: "Datos del despacho · Configuración — Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DespachoConfigPage,
});

interface Cfg {
  id: string;
  nombre: string;
  razon_social: string;
  cif: string;
  domicilio: string;
  email_secretariado: string;
  banco: string;
  iban: string;
  honorarios_fase1_default: number;
  cuota_litis_default: number;
  logo_path: string | null;
}

function DespachoConfigPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/admin/login" });
  }, [authLoading, session, navigate]);

  useEffect(() => {
    if (!session || !isAdmin) return;
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAdmin]);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("configuracion_despacho")
      .select("*")
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) {
      setCfg(data as unknown as Cfg);
      if ((data as unknown as Cfg).logo_path) {
        const { data: signed } = await supabase.storage
          .from("assets-despacho")
          .createSignedUrl((data as unknown as Cfg).logo_path!, 3600);
        if (signed?.signedUrl) setLogoUrl(signed.signedUrl);
      }
    }
    setLoading(false);
  }

  async function guardar() {
    if (!cfg) return;
    setSaving(true);
    const { error } = await supabase
      .from("configuracion_despacho")
      .update({
        nombre: cfg.nombre,
        razon_social: cfg.razon_social,
        cif: cfg.cif,
        domicilio: cfg.domicilio,
        email_secretariado: cfg.email_secretariado,
        banco: cfg.banco,
        iban: cfg.iban,
        honorarios_fase1_default: cfg.honorarios_fase1_default,
        cuota_litis_default: cfg.cuota_litis_default,
      })
      .eq("id", cfg.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configuración guardada");
  }

  async function subirLogo(file: File) {
    if (!cfg) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El logo debe pesar menos de 2MB");
      return;
    }
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      toast.error("Solo PNG o JPG");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `logo-hispajuris.${ext}`;
    const { error } = await supabase.storage
      .from("assets-despacho")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      toast.error("Error subiendo logo: " + error.message);
      return;
    }
    await supabase.from("configuracion_despacho").update({ logo_path: path }).eq("id", cfg.id);
    setUploading(false);
    toast.success("Logo actualizado");
    void cargar();
  }

  async function eliminarLogo() {
    if (!cfg?.logo_path) return;
    if (!confirm("¿Eliminar el logo actual?")) return;
    await supabase.storage.from("assets-despacho").remove([cfg.logo_path]);
    await supabase.from("configuracion_despacho").update({ logo_path: null }).eq("id", cfg.id);
    setLogoUrl(null);
    toast.success("Logo eliminado");
    void cargar();
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }
  if (!session) return null;
  if (!isAdmin) {
    return (
      <AdminLayout title="Datos del despacho">
        <p className="text-sm text-muted-foreground">Solo administradores.</p>
      </AdminLayout>
    );
  }
  if (!cfg) return null;

  return (
    <AdminLayout title="Datos del despacho" subtitle="Información usada en todos los documentos generados.">
      <div className="mb-4">
        <Link to="/admin/configuracion" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Configuración
        </Link>
      </div>

      <div className="space-y-6">
        {/* Logo */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
            <ImageIcon className="h-4 w-4" /> Logo del despacho
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-24 w-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">Sin logo</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void subirLogo(f);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Subir logo (PNG/JPG, máx 2MB)
              </button>
              {cfg.logo_path && (
                <button
                  onClick={eliminarLogo}
                  className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> Eliminar logo
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Datos */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-bold text-primary">Datos del despacho para documentos</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nombre comercial" value={cfg.nombre} onChange={(v) => setCfg({ ...cfg, nombre: v })} />
            <Input label="Razón social" value={cfg.razon_social} onChange={(v) => setCfg({ ...cfg, razon_social: v })} />
            <Input label="CIF" value={cfg.cif} onChange={(v) => setCfg({ ...cfg, cif: v })} />
            <Input label="Email secretariado" value={cfg.email_secretariado} onChange={(v) => setCfg({ ...cfg, email_secretariado: v })} />
            <div className="sm:col-span-2">
              <Input label="Domicilio" value={cfg.domicilio} onChange={(v) => setCfg({ ...cfg, domicilio: v })} />
            </div>
            <Input label="Banco" value={cfg.banco} onChange={(v) => setCfg({ ...cfg, banco: v })} />
            <Input label="IBAN / Cuenta" value={cfg.iban} onChange={(v) => setCfg({ ...cfg, iban: v })} />
            <Input
              label="Honorarios Fase I por defecto (€)"
              type="number"
              value={String(cfg.honorarios_fase1_default)}
              onChange={(v) => setCfg({ ...cfg, honorarios_fase1_default: Number(v) || 0 })}
            />
            <Input
              label="Cuota litis por defecto (%)"
              type="number"
              value={String(cfg.cuota_litis_default)}
              onChange={(v) => setCfg({ ...cfg, cuota_litis_default: Number(v) || 0 })}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <button
              onClick={guardar}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </button>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
