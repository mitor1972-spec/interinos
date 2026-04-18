import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Building2, BarChart3, Wallet } from "lucide-react";

const ITEMS = [
  { to: "/admin", label: "Leads", icon: LayoutDashboard, exact: true },
  { to: "/admin/finanzas", label: "Finanzas", icon: Wallet, exact: false },
  { to: "/admin/despachos", label: "Despachos", icon: Building2, exact: false },
  { to: "/admin/informes", label: "Informes", icon: BarChart3, exact: false },
] as const;

export function AdminNav() {
  const location = useLocation();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
