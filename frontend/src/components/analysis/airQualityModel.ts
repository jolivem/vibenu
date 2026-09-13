import type { AirQualityAnalysisDto, AirQualityLevel } from "@/types/location-analysis";

/** Partagé par `AirQualityCard` et `PdfAirQuality`. */
export const LEVEL_ORDER: AirQualityLevel[] = ["bon", "moyen", "dégradé", "mauvais", "très_mauvais"];

/** Le DTO porte `très_mauvais` avec un underscore, qu'on ne peut pas afficher tel quel. */
export const LEVEL_CONFIG: Record<
  AirQualityLevel,
  { label: string; className: string; color: string }
> = {
  bon: { label: "Bon", className: "air-badge air-badge--bon", color: "#16a34a" },
  moyen: { label: "Moyen", className: "air-badge air-badge--moyen", color: "#eab308" },
  dégradé: { label: "Dégradé", className: "air-badge air-badge--degrade", color: "#f97316" },
  mauvais: { label: "Mauvais", className: "air-badge air-badge--mauvais", color: "#dc2626" },
  très_mauvais: { label: "Très mauvais", className: "air-badge air-badge--tres-mauvais", color: "#7c1d6f" },
};

const WEEKDAY_FR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

export function shortDay(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAY_FR[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
}

/** Niveau dominant sur une période. Si égalité, retourne le pire (logique précautionneuse). */
export function modalLevel(days: AirQualityAnalysisDto["recentDays"]): AirQualityLevel | null {
  if (days.length === 0) return null;
  const counts = new Map<AirQualityLevel, number>();
  for (const d of days) counts.set(d.level, (counts.get(d.level) ?? 0) + 1);
  const max = Math.max(...counts.values());
  // Parmi les niveaux à fréquence max, prendre le pire (= ordre le plus élevé)
  const candidates = LEVEL_ORDER.filter((l) => counts.get(l) === max);
  return candidates[candidates.length - 1];
}
