import { Building2, Banknote, Scale } from "lucide-react";

const items = [
  {
    icon: Building2,
    title: "Estabilidad en el empleo",
    text: "Solicitar una relación laboral estable que elimine la precariedad estructural.",
  },
  {
    icon: Banknote,
    title: "Indemnización real",
    text: "Reclamar daños y perjuicios sin los límites máximos que el TJUE ha declarado insuficientes.",
  },
  {
    icon: Scale,
    title: "Defensa integral",
    text: "Reclamación administrativa y, si es necesario, procedimiento judicial con dirección letrada completa.",
  },
];

export function Ventajas() {
  return (
    <section className="container mx-auto mt-24 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          ¿Qué puede reclamar un interino tras la sentencia europea?
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          El TJUE ha declarado que ni el «indefinido no fijo», ni las indemnizaciones tasadas, ni
          los procesos de estabilización son sanciones adecuadas. Esto abre nuevas vías para
          personal laboral temporal, funcionarios interinos y personal estatutario temporal en
          cualquier administración pública.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {items.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="group rounded-2xl border border-border bg-card p-7 shadow-card transition hover:-translate-y-1 hover:shadow-elegant"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold text-accent-foreground shadow-gold">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-primary">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
