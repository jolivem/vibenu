import type { CommuneSlugEntry } from "@/lib/commune-slugs";

interface Props {
  commune: CommuneSlugEntry;
}

/**
 * Le modificateur `--page` aligne le titre sur la colonne de l'ossature. Le hub ville
 * écrit sa propre balise `.commune-hero` : il garde donc la mise en page d'origine.
 */

export function CommuneHero({ commune }: Props) {
  return (
    <section className="commune-hero commune-hero--page">
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
