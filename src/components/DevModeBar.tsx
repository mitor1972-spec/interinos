import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEV_HOSTS = ["lovable.dev", "localhost", "127.0.0.1"];

export function DevModeBar() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    setVisible(DEV_HOSTS.some((h) => host.includes(h)));
  }, []);

  if (!visible) return null;

  const handleUser = () => {
    navigate({ to: "/" });
  };

  const handleAdmin = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error } = await supabase.auth.signInWithPassword({
          email: "miguel@asesor.legal",
          password: "Admin123!",
        });
        if (error) {
          toast.error("No se pudo iniciar sesión como admin", {
            description: error.message,
          });
          setLoading(false);
          return;
        }
      }
      navigate({ to: "/admin" });
    } catch (e) {
      toast.error("Error inesperado al entrar como admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] flex h-10 items-center justify-center gap-3 border-t border-white/10 bg-black/75 px-4 text-xs text-white backdrop-blur-md"
      role="toolbar"
      aria-label="Dev mode"
    >
      <span className="hidden font-mono uppercase tracking-wider text-white/50 sm:inline">
        dev mode
      </span>
      <button
        type="button"
        onClick={handleUser}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1 font-medium transition hover:bg-white/15"
      >
        <span aria-hidden>👤</span> Ver como Usuario
      </button>
      <button
        type="button"
        onClick={handleAdmin}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/40 bg-amber-400/10 px-3 py-1 font-medium text-amber-100 transition hover:bg-amber-400/20 disabled:opacity-50"
      >
        <span aria-hidden>🔧</span> {loading ? "Entrando…" : "Ver como Admin"}
      </button>
    </div>
  );
}
