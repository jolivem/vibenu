import type { SecurityRating } from "@/server-shared/types/card-insights";
import type { SecurityAnalysisDto, SecurityIndicatorDto } from "@/server-shared/types/location-analysis.dto";
import { tendance } from "@/server-shared/domain/trend";

/**
 * La note de sécurité de la tuile, calculée ici et non par le modèle de langage.
 *
 * Le repère est celui de la card : les communes de même taille, ou la France quand la
 * tranche manque. La note compare la **somme** des taux de la commune à la somme des taux de
 * référence, sur les indicateurs que les deux connaissent : chaque indicateur pèse selon sa
 * fréquence habituelle, et non selon son niveau dans la commune.
 *
 * Deux biais corrigés le 29/10/2026, qui classaient 37 % des communes de 2 000 à 10 000
 * habitants en « nettement moins bonne » (55 % sous 2 000) :
 * - le **secret statistique** : un indicateur de 1 à 4 faits n'est pas publié. L'écarter ne
 *   laissait, dans une petite commune, que les indicateurs élevés. Il compte désormais au
 *   milieu de sa fourchette (2,5 faits). Un zéro compte aussi, pour zéro ;
 * - la **pondération par le taux local** : les dégradations, souvent l'indicateur le plus
 *   fréquent, écrasaient tout le reste dès qu'elles étaient hautes.
 *
 * Et deux garde-fous pour les petits nombres : « nettement » à partir de 50 % d'écart (et
 * non plus 25 %), et aucune note quand la commune est trop petite pour qu'on attende au moins
 * `MIN_FAITS` faits. Le seuil porte sur les faits **attendus** (taux de référence × population),
 * pas sur les faits observés : un village qui atteint 20 faits est presque par définition
 * au-dessus des villages, et un seuil observé ne notait que ceux-là (81 % du mauvais côté).
 */

/** Écart, en %, sous lequel (en valeur absolue) le lieu est « proche » du repère. */
const PROCHE_PCT = 15;
/** Au-delà, en valeur absolue, l'écart est franc. Sur 15 faits, 25 % tenaient à quelques faits. */
const NET_PCT = 50;
/** Faits attendus en dessous desquels on ne conclut pas : pas de note plutôt qu'une note de hasard. */
const MIN_FAITS = 20;
/** Nombre de faits retenu pour une valeur masquée (1 à 4) : le milieu de la fourchette. */
const FAITS_MASQUES = 2.5;
/** Faits correspondant à la borne basse d'une valeur masquée. */
const FAITS_BORNE_BASSE = 1;

/** Le second repère d'un indicateur, comme dans la card. */
export function secondReference(security: SecurityAnalysisDto, indicator: SecurityIndicatorDto): (number | null)[] {
  return security.tranche !== null && security.tranche !== undefined ? indicator.memeTaille : indicator.france;
}

/**
 * Taux d'une année, une valeur masquée remplacée par le milieu de sa fourchette, et le
 * dénominateur du taux (habitants ou logements), déduit des faits publiés ou de la borne
 * basse ; `null` pour un zéro, qui ne le dit pas. `null` si l'année n'a rien.
 */
function valueAt(indicator: SecurityIndicatorDto, i: number): { taux: number; denominateur: number | null } | null {
  const taux = indicator.commune[i];
  if (taux !== null && taux !== undefined) {
    const faits = indicator.faits?.[i];
    return { taux, denominateur: taux > 0 && faits ? (faits * 1000) / taux : null };
  }
  const low = indicator.borneBasse[i];
  const high = indicator.borneHaute[i];
  if (low !== null && low !== undefined && low > 0 && high !== null && high !== undefined) {
    return { taux: (FAITS_MASQUES / FAITS_BORNE_BASSE) * low, denominateur: (FAITS_BORNE_BASSE * 1000) / low };
  }
  return null;
}

/**
 * Rapport des sommes commune / repère à l'année `i`, et les faits qu'on y attendrait au taux
 * de référence.
 */
function ratioAt(security: SecurityAnalysisDto, i: number): { ratio: number; faitsAttendus: number } | null {
  let local = 0;
  let reference = 0;
  let faitsAttendus = 0;
  for (const indicator of security.indicateurs) {
    const ref = secondReference(security, indicator)[i];
    const value = valueAt(indicator, i);
    if (ref === null || ref === undefined || ref <= 0 || value === null) continue;
    local += value.taux;
    reference += ref;
    if (value.denominateur !== null) faitsAttendus += (ref * value.denominateur) / 1000;
  }
  return reference > 0 ? { ratio: local / reference, faitsAttendus } : null;
}

export function computeSecurityRating(security: SecurityAnalysisDto | null | undefined): SecurityRating | undefined {
  if (!security || security.annees.length === 0) return undefined;

  // La dernière année, pas la dernière valeur publiée : une année masquée ne doit pas
  // laisser passer le chiffre d'une année plus ancienne.
  const last = ratioAt(security, security.annees.length - 1);
  if (!last || last.faitsAttendus < MIN_FAITS) return undefined;

  const ecart = (last.ratio - 1) * 100;
  // Tendance : le même rapport, première année contre dernière. On compare des écarts au
  // repère, ce qui neutralise une hausse ou une baisse générale.
  const first = ratioAt(security, 0);
  const sens = tendance(first && first.ratio > 0 ? (last.ratio / first.ratio - 1) * 100 : null);

  if (ecart <= -NET_PCT) return sens === "en hausse" ? "bon" : "excellent";
  if (ecart < -PROCHE_PCT) return "bon";
  if (ecart < PROCHE_PCT) return sens === "en baisse" ? "bon" : sens === "en hausse" ? "mediocre" : "moyen";
  if (ecart < NET_PCT) return "mediocre";
  return sens === "en baisse" ? "mediocre" : "mauvais";
}
