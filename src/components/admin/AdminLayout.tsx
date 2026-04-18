import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Building2,
  BarChart3,
  Settings,
  UserCog,
  LogOut,
  Scale,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RoleSwitcher } from "@/components/admin/RoleSwitcher";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/finanzas", label: "Finanzas", icon: Wallet, adminOnly: true },
  { to: "/admin/despachos", label: "Despachos", icon: Building2, adminOnly: true },
  { to: "/admin/informes", label: "Informes", icon: BarChart3 },
  { to: "/admin/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
];

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminLayout({ title, subtitle, actions, children }: Props) {
  const { session, isAdmin, isLawyer, isPerito, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Roles puros (no admin) → enviar a su panel
  useEffect(() => {
    if (!loading && session && !isAdmin) {
      if (isLawyer) navigate({ to: "/abogado" });
      else if (isPerito) navigate({ to: "/perito" });
    }
  }, [loading, session, isLawyer, isPerito, isAdmin, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  const items = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile topbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link to="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-navy text-accent">
            <Scale className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-primary">Hispajuris</span>
        </Link>
        {isAdmin ? <RoleSwitcher /> : <span className="w-9" />}
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-border bg-background lg:flex">
          <SidebarContent
            items={items}
            currentPath={location.pathname}
            email={session?.user.email ?? ""}
            isAdmin={isAdmin}
            onLogout={handleLogout}
          />
        </aside>

        {/* Sidebar móvil */}
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
                items={items}
                currentPath={location.pathname}
                email={session?.user.email ?? ""}
                isAdmin={isAdmin}
                onLogout={handleLogout}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="min-w-0 flex-1">
          <div className="container mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                )}
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
  items: NavItem[];
  currentPath: string;
  email: string;
  isAdmin: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}

function SidebarContent({
  items,
  currentPath,
  email,
  isAdmin,
  onLogout,
  onNavigate,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <Link
        to="/admin"
        onClick={onNavigate}
        className="flex items-center gap-2.5 border-b border-border px-5 py-5"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-navy text-accent">
          <Scale className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-primary">Hispajuris</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-accent">
            Asesor.Legal
          </div>
        </div>
      </Link>

      {isAdmin && (
        <div className="border-b border-border px-4 py-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cambiar vista
          </p>
          <RoleSwitcher />
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? currentPath === item.to
            : currentPath.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 flex-none" />
              <span>{item.label}</span>
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
