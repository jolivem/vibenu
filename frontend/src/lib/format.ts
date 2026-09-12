export function formatFr(value: number): string {
  return value.toLocaleString("fr-FR").replace(/[  ]/g, " ");
}

/**
 * Distance en mètres, telle qu'on l'écrit en français.
 *
 * Deux précisions selon l'échelle : le dixième de kilomètre en dessous de 10 km, l'entier
 * au-delà. Ces distances sont à vol d'oiseau (`ST_Distance` géographique) ; annoncer
 * « 13,4 km » pour un hôpital donnerait une précision de 100 m à un chiffre qui ignore
 * le tracé des routes. Sous le kilomètre, le mètre est déjà l'unité juste.
 *
 * Passe par `formatFr` : la virgule décimale, pas le point de `toFixed`.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  const km = meters / 1000;
  return `${formatFr(km >= 10 ? Math.round(km) : Math.round(km * 10) / 10)} km`;
}
