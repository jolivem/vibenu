import type { CommuneSlugEntry } from "@/lib/commune-slugs";

interface Props {
  commune: CommuneSlugEntry;
  /**
   * Population, prix et revenu de l'arrondissement avec leur rang (`cityComparison.chapeau`).
   * Le chapeau était la même énumération de rubriques sur les 45 pages.
   */
  lead: string;
}

export function CommuneHero({ commune, lead }: Props) {
  return (
    <section className="commune-hero">
      <span className="landing-eyebrow">
        {commune.parentNom ? `${commune.parentNom} · Arrondissement` : "Métropole"}
      </span>
      <h1 className="commune-title">{commune.nomAffiche}</h1>
      {lead && <p className="commune-lead">{lead}</p>}
    </section>
  );
}
