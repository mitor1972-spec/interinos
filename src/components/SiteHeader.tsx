import { Phone, Scale } from "lucide-react";

const TELEFONO = "668 510 087";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-navy text-accent shadow-card">
            <Scale className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-primary">Hispajuris</div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-accent">
              Asesor.Legal
            </div>
          </div>
        </a>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${TELEFONO.replace(/\s/g, "")}`}
            className="hidden items-center gap-2 rounded-full border border-accent/40 bg-accent-soft/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent-soft sm:inline-flex"
          >
            <Phone className="h-4 w-4 text-accent" />
            {TELEFONO}
          </a>
          <a
            href={`tel:${TELEFONO.replace(/\s/g, "")}`}
            aria-label="Llamar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-accent-foreground shadow-gold sm:hidden"
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            href="#diagnostico"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-light md:inline-flex"
          >
            Analizar mi caso
          </a>
        </div>
      </div>
    </header>
  );
}
