import type { CommuneSlugEntry } from "@/lib/commune-slugs";

interface Props {
  commune: CommuneSlugEntry;
}

export function CommuneHero({ commune }: Props) {
  return (
    <section className="commune-hero">
      <span className="landing-eyebrow">
        {commune.parentNom ? `${commune.parentNom} · Arrondissement` : "Métropole"}
      </span>
      <h1 className="commune-title">{commune.nomAffiche}</h1>
      <p className="commune-lead">
        Analyse complète de l&apos;arrondissement : prix immobilier, démographie, équipements
        et qualité de l&apos;air. Données publiques actualisées.
      </p>
    </section>
  );
}
