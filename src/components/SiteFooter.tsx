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
                <a href="tel:668510087" className="flex items-center gap-2 hover:text-accent">
                  <Phone className="h-4 w-4" />
                  <span>668 510 087</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@asesor.legal" className="flex items-center gap-2 hover:text-accent">
                  <Mail className="h-4 w-4" />
                  <span>info@asesor.legal</span>
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

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/60 sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} Hispajuris · Asesor.Legal — Todos los derechos reservados
          </span>
          <a
            href="/admin/login"
            className="rounded-full border border-accent/40 px-3 py-1 font-semibold text-accent hover:bg-accent/10"
          >
            Acceso abogados →
          </a>
        </div>
      </div>
    </footer>
  );
}
