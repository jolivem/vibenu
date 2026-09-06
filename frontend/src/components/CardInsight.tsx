interface Props {
  /**
   * Absent tant que la génération n'a pas rendu, ou définitivement quand le modèle
   * n'a pas produit la clé. Dans les deux cas la card s'affiche sans phrase.
   */
  text?: string | null;
  /**
   * Fondu à l'apparition. `true` sur l'écran d'analyse, où la phrase arrive après la
   * card ; `false` en rendu serveur, où elle est déjà dans le HTML initial — l'animer
   * ne ferait que la faire clignoter au premier paint.
   */
  animate?: boolean;
  className?: string;
}

/**
 * Mini-synthèse rédigée par le modèle, sous le titre d'une card à graphiques.
 *
 * Le libellé « En bref » n'est pas décoratif : il sépare visuellement le commentaire
 * de la donnée sourcée qui l'entoure. Tout le reste de la page vient de fichiers
 * publics vérifiables ; cette phrase-là est une interprétation, et le lecteur doit
 * pouvoir la reconnaître comme telle d'un coup d'œil.
 *
 * Pas de `aria-live` : sept régions live qui s'annoncent d'un coup seraient hostiles
 * au lecteur d'écran. Le texte entre dans le DOM et se lit normalement.
 */
export function CardInsight({ text, animate = true, className }: Props) {
  const value = text?.trim();
  if (!value) return null;

  const classes = ["card-insight", animate ? "card-insight--enter" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <p className={classes}>
      {/* L'espace est explicite : la marge CSS règle l'affichage, pas le copier-coller
          ni la lecture par un lecteur d'écran, qui liraient sinon « En brefLe prix ». */}
      <span className="card-insight-tag">En bref</span>{" "}
      {value}
    </p>
  );
}
