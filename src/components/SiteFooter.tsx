import { Phone, Mail, Scale } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-gradient-navy text-primary-foreground">
      <div className="container mx-auto px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent">
                <Scale className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-bold">Hispajuris</div>
                <div className="text-xs font-medium uppercase tracking-wider text-accent">
                  Asesor.Legal
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-primary-foreground/70">
              Servicio prestado por Hispajuris Abogados. La información de esta web es orientativa y
              no constituye asesoramiento jurídico.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent">Contacto</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href="tel:900105108" className="flex items-center gap-2 hover:text-accent">
                  <Phone className="h-4 w-4" /> 900 105 108
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@asesor.legal"
                  className="flex items-center gap-2 hover:text-accent"
                >
                  <Mail className="h-4 w-4" /> info@asesor.legal
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
              <li>
                <a href="#" className="hover:text-accent">
                  Política de privacidad
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent">
                  Aviso legal
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Hispajuris · Asesor.Legal — Todos los derechos reservados
        </div>
      </div>
    </footer>
  );
}
