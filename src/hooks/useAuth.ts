import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  session: Session | null;
  isLawyer: boolean;
  isAdmin: boolean;
  isPerito: boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isLawyer, setIsLawyer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPerito, setIsPerito] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkRole = async (uid: string | undefined) => {
      if (!uid) {
        if (active) {
          setIsLawyer(false);
          setIsAdmin(false);
          setIsPerito(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);

      if (!active) return;

      if (error) {
        setIsLawyer(false);
        setIsAdmin(false);
        setIsPerito(false);
        return;
      }

      const roles = Array.isArray(data) ? data.map((r) => r.role) : [];
      setIsAdmin(roles.includes("admin"));
      setIsLawyer(roles.includes("lawyer") || roles.includes("admin"));
      setIsPerito(roles.includes("perito") || roles.includes("admin"));
    };

    const resolveSession = async (newSession: Session | null) => {
      if (!active) return;
      setLoading(true);
      setSession(newSession);
      await checkRole(newSession?.user?.id);
      if (active) setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void resolveSession(newSession);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => resolveSession(s))
      .catch(() => {
        if (!active) return;
        setSession(null);
        setIsLawyer(false);
        setIsAdmin(false);
        setIsPerito(false);
        setLoading(false);
      });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, isLawyer, isAdmin, isPerito, loading };
}
