/**
 * Un arrondissement parmi ceux de sa ville : rangs et phrases chiffrées.
 *
 * Ce sont les phrases propres à chaque page. Deux arrondissements d'une même ville partageaient
 * ~40 % de leur texte mot pour mot, et Google en écartait la moitié comme quasi-doublons :
 * « 3e plus cher des 20 arrondissements » ne se lit que sur une seule page.
 *
 * TypeScript calcule le rang, la phrase le dit — aucun modèle ici. Les chiffres viennent des
 * mêmes `CommuneStats` que les cards, mises en cache 24 h par arrondissement : charger la ville
 * entière ne coûte que la première page rendue (le hub le fait déjà).
 */

import {
  CITIES,
  getArrondissementsByCity,
  type City,
  type CommuneSlugEntry,
} from "@/lib/commune-slugs";
import { FEATURES } from "@/lib/site-features";
import { getCommuneStatsService } from "@/server-modules/commune-stats/application/commune-stats.service";
import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { hasRentContent, rentOf } from "@/components/analysis/rentsModel";
import { formatEur, formatInt } from "./format";
import type { FaqItem } from "./CommuneFaqSection";

export interface ArrondissementStats {
  entry: CommuneSlugEntry;
  stats: CommuneStats;
}

/** Les arrondissements de la ville dont les stats ont pu être lues, dans l'ordre INSEE. */
export async function loadCityStats(city: City): Promise<ArrondissementStats[]> {
  const service = getCommuneStatsService();
  const entries = getArrondissementsByCity(city);
  const results = await Promise.allSettled(entries.map((e) => service.getStats(e.codeCommune)));
  return results.flatMap((r, i) =>
    r.status === "fulfilled" ? [{ entry: entries[i], stats: r.value }] : [],
  );
}

export type IndicateurId = "prix" | "loyer" | "revenu" | "population" | "proprietaires" | "chomage";

interface Indicateur {
  value: (stats: CommuneStats) => number | null;
  /** Prédicat du haut du classement ; `o` vaut "" au 1er rang, « 3e » sinon. */
  haut: (o: string) => string;
  bas: (o: string) => string;
  /** Pour le milieu du classement : « se classe 9e pour … ». */
  critere: string;
}

const positif = (v: number | null | undefined): number | null =>
  v !== null && v !== undefined && Number.isFinite(v) && v > 0 ? v : null;

const INDICATEURS: Record<IndicateurId, Indicateur> = {
  prix: {
    value: (s) => positif(s.prix.prixM2Median),
    haut: (o) => `est le ${o}plus cher à l'achat`,
    bas: (o) => `est le ${o}moins cher à l'achat`,
    critere: "le prix à l'achat",
  },
  loyer: {
    value: (s) =>
      FEATURES.showRents && hasRentContent(s.loyers) ? positif(rentOf(s.loyers, "app")?.loyerM2) : null,
    haut: (o) => `a le ${o}loyer le plus élevé`,
    bas: (o) => `a le ${o}loyer le plus bas`,
    critere: "les loyers",
  },
  revenu: {
    value: (s) => positif(s.demo.revenuMedianPondere),
    haut: (o) => `est le ${o}plus aisé`,
    bas: (o) => `est le ${o}plus modeste`,
    critere: "le revenu médian",
  },
  population: {
    value: (s) => positif(s.demo.populationTotale),
    haut: (o) => `est le ${o}plus peuplé`,
    bas: (o) => `est le ${o}moins peuplé`,
    critere: "la population",
  },
  proprietaires: {
    value: (s) => positif(s.housing?.commune?.pctProprietaires),
    haut: (o) => `compte la ${o}plus forte part de propriétaires`,
    bas: (o) => `compte la ${o}plus faible part de propriétaires`,
    critere: "la part de propriétaires",
  },
  chomage: {
    value: (s) => positif(s.employment?.commune?.tauxChomage),
    haut: (o) => `a le ${o}taux de chômage le plus élevé`,
    bas: (o) => `a le ${o}taux de chômage le plus bas`,
    critere: "le taux de chômage",
  },
};

/** En dessous, un rang ne dit plus rien. */
const MIN_CLASSES = 5;

export interface Rang {
  /** 1 = valeur la plus haute. */
  rang: number;
  total: number;
}

export function rangDe(city: ArrondissementStats[], code: string, id: IndicateurId): Rang | null {
  const { value } = INDICATEURS[id];
  const valeurs = city
    .map((a) => ({ code: a.entry.codeCommune, v: value(a.stats) }))
    .filter((x): x is { code: string; v: number } => x.v !== null);
  const moi = valeurs.find((x) => x.code === code);
  if (!moi || valeurs.length < MIN_CLASSES) return null;
  return { rang: 1 + valeurs.filter((x) => x.v > moi.v).length, total: valeurs.length };
}

const ordinal = (n: number) => (n === 1 ? "" : `${n}e `);

/**
 * « est le 3e plus cher à l'achat », ou, au milieu du classement, « se classe 9e pour les
 * loyers ». Sans le « des 20 arrondissements de Paris », que la phrase dit une seule fois.
 *
 * Haut et bas se partagent chacun le premier tiers : ce qui est entre les deux n'est ni l'un
 * ni l'autre, et le dire ainsi évite le « 10e moins cher » qui se lit comme un superlatif.
 */
function position({ rang, total }: Rang): "haut" | "bas" | "milieu" {
  const tiers = Math.ceil(total / 3);
  if (rang <= tiers) return "haut";
  if (total - rang + 1 <= tiers) return "bas";
  return "milieu";
}

function predicat(id: IndicateurId, r: Rang): string {
  const ind = INDICATEURS[id];
  switch (position(r)) {
    case "haut":
      return ind.haut(ordinal(r.rang));
    case "bas":
      return ind.bas(ordinal(r.total - r.rang + 1));
    case "milieu":
      return `se classe ${r.rang}e pour ${ind.critere}`;
  }
}

/** Le prédicat complet, seul : « est le 3e plus cher à l'achat des 20 arrondissements de Paris ». */
export function predicatRang(id: IndicateurId, r: Rang, ville: string): string {
  return position(r) === "milieu"
    ? `se classe ${r.rang}e sur ${r.total} pour ${INDICATEURS[id].critere}`
    : `${predicat(id, r)} des ${r.total} arrondissements de ${ville}`;
}

/**
 * Une phrase pour plusieurs indicateurs, sujet et repère dits une fois : « Parmi les 20
 * arrondissements de Paris, Paris 8e est le 5e plus cher à l'achat et a le 5e loyer le plus
 * élevé. » — vide si aucun n'est classable.
 */
export function phraseRangs(
  city: ArrondissementStats[],
  entry: CommuneSlugEntry,
  ids: IndicateurId[],
): string {
  const rangs = ids.flatMap((id) => {
    const r = rangDe(city, entry.codeCommune, id);
    return r ? [{ id, r }] : [];
  });
  if (rangs.length === 0) return "";
  const ville = CITIES[entry.city].nomAffiche;
  const total = Math.max(...rangs.map((x) => x.r.total));
  const preds = rangs.map(({ id, r }) => predicat(id, r));
  const liste = preds.length === 1 ? preds[0] : `${preds.slice(0, -1).join(", ")} et ${preds[preds.length - 1]}`;
  return `Parmi les ${total} arrondissements de ${ville}, ${entry.nomCourt} ${liste}.`;
}

/** « 3e sur 20 », pour les tableaux et la méta-description. */
export function rangCourt(r: Rang | null): string | null {
  if (!r) return null;
  return `${r.rang === 1 ? "1er" : `${r.rang}e`} sur ${r.total}`;
}

/**
 * Le chapeau de la page : population, prix et revenu, chacun avec son rang. Rien de ce qui
 * s'y lit ne se retrouve à l'identique sur un autre arrondissement.
 */
export function chapeau(city: ArrondissementStats[], entry: CommuneSlugEntry, stats: CommuneStats): string {
  const parts: string[] = [];
  if (stats.demo.populationTotale > 0) {
    parts.push(`${entry.nomCourt} compte ${formatInt(stats.demo.populationTotale)} habitants.`);
  }
  const prix = INDICATEURS.prix.value(stats);
  if (prix !== null) {
    const r = rangCourt(rangDe(city, entry.codeCommune, "prix"));
    parts.push(
      `Prix médian d'un appartement : ${formatEur(prix)}/m²${r ? `, ${r} arrondissements du plus cher au moins cher` : ""}.`,
    );
  }
  const revenu = INDICATEURS.revenu.value(stats);
  if (revenu !== null) {
    const r = rangCourt(rangDe(city, entry.codeCommune, "revenu"));
    parts.push(
      `Revenu médian : ${formatEur(revenu)} par an${r ? `, ${r} du plus aisé au plus modeste` : ""}.`,
    );
  }
  return parts.join(" ");
}

/** Les voisins comparés : une ligne par arrondissement, la page courante en premier. */
export interface LigneVoisin {
  entry: CommuneSlugEntry;
  prix: number | null;
  loyer: number | null;
  revenu: number | null;
}

export function lignesVoisins(city: ArrondissementStats[], entry: CommuneSlugEntry): LigneVoisin[] {
  const parCode = new Map(city.map((a) => [a.entry.slug, a]));
  return [entry.slug, ...entry.voisins].flatMap((slug) => {
    const a = parCode.get(slug);
    if (!a) return [];
    return [
      {
        entry: a.entry,
        prix: INDICATEURS.prix.value(a.stats),
        loyer: INDICATEURS.loyer.value(a.stats),
        revenu: INDICATEURS.revenu.value(a.stats),
      },
    ];
  });
}

/**
 * « Paris 8e est-il un arrondissement cher ? » — la question que pose la recherche, avec une
 * réponse que seule cette page peut donner : son rang et l'écart à la médiane de la ville.
 */
export function faqPrixRang(
  city: ArrondissementStats[],
  entry: CommuneSlugEntry,
  stats: CommuneStats,
): FaqItem | null {
  const prix = INDICATEURS.prix.value(stats);
  const r = rangDe(city, entry.codeCommune, "prix");
  if (prix === null || !r) return null;
  const ville = CITIES[entry.city].nomAffiche;
  const repere = positif(stats.prixBenchmarkVille.prixM2Median);
  const ecart =
    repere === null
      ? ""
      : ` Sur l'ensemble de ${ville}, la médiane est de ${formatEur(repere)} le m².`;
  return {
    question: `${entry.nomCourt} est-il un arrondissement cher ?`,
    answer: `Avec ${formatEur(prix)} le m² en médiane pour un appartement, ${entry.nomCourt} ${predicatRang("prix", r, ville)}.${ecart} Source : DVF, ventes des 24 derniers mois.`,
  };
}
