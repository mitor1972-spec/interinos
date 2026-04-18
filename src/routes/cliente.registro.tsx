import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Scale, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cliente/registro")({
  head: () => ({
    meta: [
      { title: "Crear contraseña — Hispajuris" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RegistroPage,
});

function RegistroPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== password2) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);

    // Verificamos que existe un lead con ese email
    const { data: leadCheck, error: leadErr } = await supabase
      .from("leads_interinos")
      .select("id")
      .ilike("email", email.trim())
      .maybeSingle();

    if (leadErr || !leadCheck) {
      setLoading(false);
      toast.error(
        "No encontramos ningún caso con este email. Asegúrate de usar el mismo email del formulario inicial.",
      );
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/cliente`,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      "Cuenta creada. Si tu email requiere verificación, revisa tu bandeja de entrada.",
    );
    navigate({ to: "/cliente/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2.5 text-primary-foreground"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Scale className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold">Hispajuris</div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-accent">
              Asesor.Legal
            </div>
          </div>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="text-2xl font-bold text-primary">Crear contraseña</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Usa el mismo email con el que enviaste el formulario.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-foreground">Email del caso</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-foreground">Contraseña</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Mínimo 8 caracteres.
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-foreground">
                Repite la contraseña
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary-light disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creando cuenta…
                </>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              to="/cliente/login"
              className="font-semibold text-accent hover:underline"
            >
              Acceder
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
