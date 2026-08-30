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
