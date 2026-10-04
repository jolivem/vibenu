import type { AirQualityLevel } from "@/types/location-analysis";

const WEEKDAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

const levels: Record<AirQualityLevel, string> = {
  bon: "Bon",
  moyen: "Moyen",
  dégradé: "Dégradé",
  mauvais: "Mauvais",
  très_mauvais: "Très mauvais",
};

/** Card « Qualité de l'air » : indice quotidien Atmo des derniers jours. */
export const air = {
  title: "Qualité de l'air",
  /** Les cinq niveaux de l'indice. Les clés sont les codes du DTO. */
  levels,
  /** « lun 05 » : jour abrégé et quantième, sous chaque pastille de l'historique. */
  shortDay: (iso: string) => {
    const d = new Date(iso);
    return `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
  },
  /** Polluants, par code Atmo. Un code inconnu d'ici garde le libellé envoyé par le serveur. */
  pollutants: {
    no2: "dioxyde d'azote (NO₂)",
    o3: "ozone (O₃)",
    pm10: "particules PM10",
    pm25: "particules fines PM2,5",
    so2: "dioxyde de soufre (SO₂)",
  } as Record<string, string>,
  recentDays: (count: number) => `Sur les ${count} derniers jours`,
  /** Entre le décompte de jours et la pastille du niveau moyen. */
  averageLead: " — en moyenne ",
  monthlyLead: (count: number) => `Sur les ${count} derniers jours — qualité moyenne `,
  dayTitle: (date: string, level: AirQualityLevel) => `${date} : ${levels[level]}`,
  pollutantLevel: (level: AirQualityLevel) => `— ${levels[level]}`,
  debugSummary: "Données reçues d'Atmo (debug)",
  /** Fiche PDF. */
  pdfLabel: "Qualité de l'air",
  pdfLine: (level: AirQualityLevel, days: number) =>
    `niveau ${levels[level].toLowerCase()} sur les ${days} derniers jours`,
};

export type AirMessages = typeof air;
