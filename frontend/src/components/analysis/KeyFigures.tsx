/**
 * Le paramètre de type porte la taxonomie de la page : l'écran d'analyse a la sienne,
 * les pages commune la leur. Le composant, lui, ne fait de `section` qu'un `href` — il
 * n'a aucune table de titres à consulter, donc rien à savoir de l'une ni de l'autre.
 */
export interface KeyFigure<Id extends string = string> {
  /**
   * Section vers laquelle la tuile ancre.
   *
   * Plusieurs tuiles peuvent viser la même : sur un hub de ville, le prix médian et la
   * population sont deux chiffres distincts d'une même rubrique. L'écran d'analyse, lui,
   * s'en tient à une tuile par section — c'est son modèle qui l'impose (`Partial<Record<
   * SectionId, KeyFigure>>`), pas ce composant.
   */
  section: Id;
  label: string;
  value: string;
}

/**
 * Bandeau de chiffres clés, sous le titre de la page.
 *
 * Chaque tuile est un lien d'ancre : c'est du HTML natif, donc le défilement doux et le
 * décalage sous la barre fixe sont réglés en CSS (`scroll-behavior`, `scroll-margin-top`),
 * sans écouteur JavaScript.
 *
 * La clé React joint la section au libellé : la section seule ne suffit pas dès que deux
 * tuiles ancrent au même endroit.
 */
export function KeyFigures({ figures }: { figures: KeyFigure<string>[] }) {
  if (figures.length === 0) return null;

  return (
    <nav className="key-figures" aria-label="Chiffres clés">
      {figures.map((figure) => (
        <a
          key={`${figure.section}-${figure.label}`}
          href={`#${figure.section}`}
          className="key-figure"
        >
          <span className="key-figure-label">{figure.label}</span>
          <span className="key-figure-value">{figure.value}</span>
        </a>
      ))}
    </nav>
  );
}
