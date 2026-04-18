import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Scale, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Acceso abogados — Hispajuris · Asesor.Legal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toast.error(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos"
          : error.message,
      );
      return;
    }

    // Comprobar roles para decidir destino
    const userId = signIn.user?.id;
    let target: "/admin" | "/abogado" | "/perito" = "/admin";
    if (userId) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const list = (roles ?? []).map((r) => r.role);
      if (list.includes("admin")) {
        target = "/admin";
      } else if (list.includes("lawyer")) {
        target = "/abogado";
      } else if (list.includes("perito")) {
        target = "/perito";
      }
    }

    toast.success("Acceso correcto");
    navigate({ to: target });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5 text-primary-foreground">
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
          <h1 className="text-2xl font-bold text-primary">Acceso abogados</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Panel privado de gestión de casos.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-foreground">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-foreground">Contraseña</span>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary-light disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Accediendo...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            ¿No tienes cuenta? Pide acceso al administrador.
          </p>
        </div>

        <Link to="/" className="mt-6 block text-center text-xs text-primary-foreground/70 hover:text-accent">
          ← Volver a la web
        </Link>
      </div>
    </div>
  );
}
