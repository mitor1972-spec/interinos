import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  session: Session | null;
  isLawyer: boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isLawyer, setIsLawyer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkRole = async (uid: string | undefined) => {
      if (!uid) {
        if (active) setIsLawyer(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (!active) return;
      if (error) {
        setIsLawyer(false);
        return;
      }
      setIsLawyer(
        Array.isArray(data) && data.some((r) => r.role === "lawyer" || r.role === "admin"),
      );
    };

    // 1) Listener primero (recomendado)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      // diferimos para evitar deadlocks
      setTimeout(() => checkRole(newSession?.user?.id), 0);
    });

    // 2) Luego getSession
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!active) return;
      setSession(s);
      checkRole(s?.user?.id).finally(() => {
        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, isLawyer, loading };
}
