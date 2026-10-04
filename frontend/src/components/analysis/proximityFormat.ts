import type { NearbyMessages } from "@/i18n/messages/fr/analysis/nearby";

/**
 * Au-delà de cette distance, on ne propose plus de temps de marche.
 *
 * « 172 min à pied » pour un hôpital à 13 km est une réponse absurde à une question
 * qu'on ne se pose pas : personne ne va aux urgences à pied. Le kilométrage seul est
 * l'unité juste pour ces équipements-là.
 *
 * Partagé par les cards Voisinage et Transports et par leurs pendants PDF.
 */
export const WALKABLE_LIMIT_METERS = 2000;

// Vitesse de marche moyenne ≈ 4,5 km/h (75 m/min)
export function formatWalkingTime(meters: number, m: NearbyMessages): string {
  const minutes = Math.max(1, Math.round(meters / 75));
  if (minutes < 60) return m.walking(minutes);
  const h = Math.floor(minutes / 60);
  return m.walkingHours(h, Math.round((minutes - h * 60) / 5) * 5);
}

/**
 * Temps de marche seul, ou distance seule — jamais les deux.
 *
 * La distance ne disparaît que là où le temps de marche la remplace utilement. Une gare
 * à 20 km se lit « 20 km », pas « 4 h 25 à pied » : le temps de marche y est exact et
 * sans usage, puisque personne ne rejoint sa gare à pied à cette distance.
 */
export function formatProximity(meters: number, m: NearbyMessages): string {
  return meters <= WALKABLE_LIMIT_METERS ? formatWalkingTime(meters, m) : m.distance(meters);
}
