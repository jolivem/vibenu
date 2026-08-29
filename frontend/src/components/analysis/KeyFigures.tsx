import type { SectionId } from "./sections";

export interface KeyFigure {
  /** Section vers laquelle la tuile ancre — une tuile par section, le bandeau
   *  est un miroir du sommaire. */
  section: SectionId;
  label: string;
  value: string;
}

/**
 * Bandeau de chiffres clés, sous le titre de la page.
 *
 * Chaque tuile est un lien d'ancre : c'est du HTML natif, donc le défilement doux et le
 * décalage sous la barre fixe sont réglés en CSS (`scroll-behavior`, `scroll-margin-top`),
 * sans écouteur JavaScript.
 */
export function KeyFigures({ figures }: { figures: KeyFigure[] }) {
  if (figures.length === 0) return null;

  return (
    <nav className="key-figures" aria-label="Chiffres clés">
      {figures.map((figure) => (
        <a key={figure.section} href={`#${figure.section}`} className="key-figure">
          <span className="key-figure-label">{figure.label}</span>
          <span className="key-figure-value">{figure.value}</span>
        </a>
      ))}
    </nav>
  );
}
