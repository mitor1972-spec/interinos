import { useNavigate } from "@tanstack/react-router";
import { Shield, Briefcase, User, Calculator } from "lucide-react";
import { useImpersonation, type ImpersonatedRole } from "@/lib/impersonation";

const OPTIONS: { value: ImpersonatedRole; label: string; icon: typeof Shield }[] = [
  { value: "admin", label: "Admin", icon: Shield },
  { value: "abogado", label: "Abogado", icon: Briefcase },
  { value: "perito", label: "Perito", icon: Calculator },
  { value: "cliente", label: "Cliente", icon: User },
];

export function RoleSwitcher() {
  const { role, setRole } = useImpersonation();
  const navigate = useNavigate();

  const handleChange = (next: ImpersonatedRole) => {
    setRole(next);
    if (next === "cliente") {
      navigate({ to: "/cliente" });
    } else if (next === "abogado") {
      navigate({ to: "/abogado" });
    } else if (next === "perito") {
      navigate({ to: "/perito" });
    } else {
      navigate({ to: "/admin" });
    }
  };

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5">
      <span className="ml-2 hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
        Vista
      </span>
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = role === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleChange(opt.value)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={active}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ImpersonationBanner() {
  const { role, setRole, isImpersonating } = useImpersonation();
  if (!isImpersonating) return null;
  return (
    <div className="border-b border-warning/40 bg-warning/15 px-4 py-1.5 text-center text-[11px] font-semibold text-warning-foreground">
      Modo impersonación activo · viendo como{" "}
      <span className="uppercase">{role}</span>{" "}
      <button
        type="button"
        onClick={() => setRole("admin")}
        className="ml-1 underline underline-offset-2 hover:no-underline"
      >
        salir
      </button>
    </div>
  );
}
