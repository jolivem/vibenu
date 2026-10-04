/**
 * Géométrie commune aux graphes en courbes de l'écran d'analyse — répartition par âge
 * et profil climatique mensuel.
 *
 * Source unique volontaire : les deux graphes se suivent dans la même page et doivent
 * avoir exactement la même hauteur et les mêmes marges, sinon l'œil lit deux échelles
 * là où il n'y en a qu'une. Le style (couleurs, taille des libellés d'axes) est
 * partagé de la même façon, par les classes CSS `.line-chart*`.
 *
 * `W` vaut pour l'échelle : le SVG est posé en `viewBox` avec `width: 100%`, donc tout
 * est mis à l'échelle par `largeur_conteneur / W`. Deux graphes de même `W` rendent
 * leurs libellés à la même taille apparente — c'est ce qui les aligne réellement, pas
 * la valeur en pixels de `font-size`.
 */
/**
 * Demi-largeur d'une bande d'incertitude, en fraction du demi-pas entre deux abscisses.
 *
 * Partagé entre le rendu (`LineChart`) et les modèles qui construisent l'échelle des
 * abscisses : un modèle qui pose des bandes doit réserver cette marge aux deux
 * extrémités, sinon la première déborde sur les graduations de l'ordonnée.
 */
export const BAND_HALF_WIDTH_RATIO = 0.6;

export const LINE_CHART_DIMENSIONS = {
  W: 400,
  H: 220,
  padL: 36,
  padR: 12,
  padT: 10,
  padB: 38,
} as const;

/**
 * Abscisses : l'année complète aux deux extrémités, deux chiffres entre les deux.
 *
 * « 2016 » répété dix fois se chevaucherait — d'où l'abrégé au départ. Mais une rangée
 * de « 16 17 18 … 25 » ne dit plus de quoi il s'agit : ce sont peut-être des âges, des
 * rangs, des numéros de département. Les deux bornes écrites en clair suffisent à
 * ancrer l'échelle, et le lecteur déduit le reste sans effort.
 *
 * La place existe aux extrémités et nulle part ailleurs : `BAND_HALF_WIDTH_RATIO`
 * réserve un retrait de part et d'autre du tracé, si bien que le premier et le dernier
 * point sont les seuls à n'avoir de voisin que d'un côté.
 *
 * Une seule année → elle est écrite en entier, l'abréger n'économiserait rien.
 */
export function yearLabels(annees: number[]): string[] {
  return annees.map((annee, i) =>
    i === 0 || i === annees.length - 1 ? String(annee) : String(annee).slice(2),
  );
}

/** Pas d'axe lisible : 1, 2, 5, 10… selon l'amplitude, pour 4 graduations. */
export function niceStep(max: number): number {
  const target = (max || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}
