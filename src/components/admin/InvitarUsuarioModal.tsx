import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { invitarUsuario } from "@/lib/usuarios.functions";
import { listarDespachos, type Despacho } from "@/lib/abogados";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const PROVINCIAS_ES = [
  "Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Barcelona","Burgos",
  "Cáceres","Cádiz","Cantabria","Castellón","Ceuta","Ciudad Real","Córdoba","Cuenca","Girona",
  "Granada","Guadalajara","Gipuzkoa","Huelva","Huesca","Illes Balears","Jaén","La Coruña",
  "La Rioja","Las Palmas","León","Lleida","Lugo","Madrid","Málaga","Melilla","Murcia","Navarra",
  "Ourense","Palencia","Pontevedra","Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla",
  "Soria","Tarragona","Teruel","Toledo","Valencia","Valladolid","Bizkaia","Zamora","Zaragoza",
];

export function InvitarUsuarioModal({ onClose, onCreated }: Props) {
  const invitar = useServerFn(invitarUsuario);
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState<"admin" | "lawyer" | "perito">("lawyer");
  const [despachoId, setDespachoId] = useState<string>("");
  const [provincias, setProvincias] = useState<string[]>([]);

  useEffect(() => {
    listarDespachos().then(setDespachos);
  }, []);

  const toggleProv = (p: string) =>
    setProvincias((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await invitar({
        data: {
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          rol,
          telefono: telefono.trim() || null,
          despacho_id: rol === "lawyer" && despachoId ? despachoId : null,
          provincias: rol === "lawyer" ? provincias : [],
        },
      });
      if (res.reused_existing) {
        toast.success("Usuario existente actualizado y rol asignado");
      } else {
        toast.success("Usuario creado. Pídele que use 'Olvidé mi contraseña' para entrar.");
      }
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creando usuario");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-background shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-primary">
            <UserPlus className="h-4 w-4" /> Añadir usuario
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre completo *">
              <input
                required
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Email *">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Rol *">
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as typeof rol)}
                className="input"
              >
                <option value="admin">Administrador</option>
                <option value="lawyer">Abogado</option>
                <option value="perito">Perito</option>
              </select>
            </Field>
          </div>

          {rol === "lawyer" && (
            <>
              <div className="mt-3">
                <Field label="Despacho asignado">
                  <select
                    value={despachoId}
                    onChange={(e) => setDespachoId(e.target.value)}
                    className="input"
                  >
                    <option value="">— Sin despacho —</option>
                    {despachos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                        {d.ciudad ? ` · ${d.ciudad}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Provincias que gestiona
                </p>
                <div className="grid max-h-44 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 sm:grid-cols-3">
                  {PROVINCIAS_ES.map((p) => (
                    <label key={p} className="flex items-center gap-1.5 text-[12px]">
                      <input
                        type="checkbox"
                        checked={provincias.includes(p)}
                        onChange={() => toggleProv(p)}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {provincias.length} provincia(s) seleccionada(s).
                </p>
              </div>
            </>
          )}

          <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[12px] text-foreground">
            Se creará la cuenta con email confirmado. El nuevo usuario podrá entrar usando
            <strong> "Olvidé mi contraseña" </strong> en la pantalla de login para fijar su contraseña.
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-light disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear usuario
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 13px;
          color: hsl(var(--foreground));
        }
        .input:focus { outline: 2px solid hsl(var(--accent) / 0.5); outline-offset: 0; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
