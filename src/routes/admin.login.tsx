import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Scale, Loader2, Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const log = (msg: string) => {
    console.log("[login]", msg);
    setDebugLog((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    setDebugLog([]);

    if (!email.trim() || !password) {
      setErrorMsg("Introduce email y contraseña.");
      setLoading(false);
      return;
    }

    try {
      log(`Enviando credenciales a Supabase Auth (${email.trim()})...`);
      const { data: signIn, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        log(`Error Supabase: ${error.message}`);
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Email o contraseña incorrectos."
            : error.message,
        );
        setLoading(false);
        return;
      }

      log(`Sesión creada para userId=${signIn.user?.id}. Comprobando roles...`);

      const userId = signIn.user?.id;
      let target: "/admin" | "/abogado" | "/perito" = "/admin";
      if (userId) {
        const { data: roles, error: rolesErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        if (rolesErr) {
          log(`Error leyendo roles: ${rolesErr.message}`);
        }

        const list = (roles ?? []).map((r) => r.role);
        log(`Roles encontrados: [${list.join(", ") || "ninguno"}]`);

        if (list.includes("admin")) target = "/admin";
        else if (list.includes("lawyer")) target = "/abogado";
        else if (list.includes("perito")) target = "/perito";
        else {
          setErrorMsg("Tu cuenta no tiene rol asignado. Contacta con el administrador.");
          setLoading(false);
          return;
        }
      }

      log(`Redirigiendo a ${target}...`);
      toast.success("Acceso correcto");
      // Hard redirect: evita el bug "Failed to fetch dynamically imported module"
      window.location.href = target;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Excepción: ${msg}`);
      setErrorMsg(`Error inesperado: ${msg}`);
      setLoading(false);
    }
  };

  const handleClearSession = async () => {
    setLoading(true);
    setErrorMsg(null);
    setDebugLog([]);
    log("Limpiando sesión local y cookies de Supabase...");
    try {
      await supabase.auth.signOut();
      // Limpieza agresiva por si quedó algo en localStorage
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.includes("supabase"))
        .forEach((k) => localStorage.removeItem(k));
      log("Sesión limpiada. Recargando página...");
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Error limpiando sesión: ${msg}`);
      setLoading(false);
    }
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

          {errorMsg && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-foreground">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
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
                  disabled={loading}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
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

          <button
            type="button"
            onClick={handleClearSession}
            disabled={loading}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Limpiar sesión y reintentar
          </button>

          {debugLog.length > 0 && (
            <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Diagnóstico
              </div>
              <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-foreground/80">
                {debugLog.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

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
