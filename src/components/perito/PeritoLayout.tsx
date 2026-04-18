import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Calculator,
  CalendarDays,
  Sparkles,
  UserRound,
  LogOut,
  Scale,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Calculator;
  exact?: boolean;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { to: "/perito", label: "Mis casos", icon: Calculator, exact: true },
  { to: "/perito/calendario", label: "Calendario", icon: CalendarDays, soon: true },
  { to: "/perito/ayuda-ia", label: "Ayuda IA", icon: Sparkles },
  { to: "/perito/perfil", label: "Mi perfil", icon: UserRound },
];

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PeritoLayout({ title, subtitle, actions, children }: Props) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link to="/perito" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-navy text-accent">
            <Scale className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-primary">Hispajuris</span>
        </Link>
        <span className="w-9" />
      </header>

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-border bg-background lg:flex">
          <SidebarContent
            currentPath={location.pathname}
            email={session?.user.email ?? ""}
            onLogout={handleLogout}
          />
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-primary/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className="h-full w-72 max-w-[85vw] border-r border-border bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-end px-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarContent
                currentPath={location.pathname}
                email={session?.user.email ?? ""}
                onLogout={handleLogout}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <div className="container mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  currentPath: string;
  email: string;
  onLogout: () => void;
  onNavigate?: () => void;
}

function SidebarContent({ currentPath, email, onLogout, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <Link
        to="/perito"
        onClick={onNavigate}
        className="flex items-center gap-2.5 border-b border-border px-5 py-5"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-navy text-accent">
          <Scale className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-primary">Hispajuris</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-accent">
            Panel perito
          </div>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? currentPath === item.to
            : currentPath.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 flex-none" />
                {item.label}
              </span>
              {item.soon && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                  Próx.
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <p className="mb-2 truncate text-[11px] text-muted-foreground" title={email}>
          {email}
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
        >
          <LogOut className="h-3.5 w-3.5" /> Salir
        </button>
      </div>
    </div>
  );
}
