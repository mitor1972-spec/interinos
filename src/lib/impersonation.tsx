import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ImpersonatedRole = "admin" | "abogado" | "cliente";

const STORAGE_KEY = "lov_impersonated_role";

interface Ctx {
  role: ImpersonatedRole;
  setRole: (r: ImpersonatedRole) => void;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<Ctx | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<ImpersonatedRole>("admin");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ImpersonatedRole | null;
      if (stored === "admin" || stored === "abogado" || stored === "cliente") {
        setRoleState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setRole = (r: ImpersonatedRole) => {
    setRoleState(r);
    try {
      localStorage.setItem(STORAGE_KEY, r);
    } catch {
      // ignore
    }
  };

  return (
    <ImpersonationContext.Provider
      value={{ role, setRole, isImpersonating: role !== "admin" }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): Ctx {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) {
    // Fallback seguro si se usa fuera del provider
    return {
      role: "admin",
      setRole: () => {},
      isImpersonating: false,
    };
  }
  return ctx;
}
