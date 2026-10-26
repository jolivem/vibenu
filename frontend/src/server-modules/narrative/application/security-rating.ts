import type { SecurityRating } from "@/server-shared/types/card-insights";
import type { SecurityAnalysisDto, SecurityIndicatorDto } from "@/server-shared/types/location-analysis.dto";
import { ecartPct, firstNumber, tendance } from "@/server-shared/domain/trend";

/**
 * La note de sécurité de la tuile, calculée ici et non plus par le modèle de langage.
 *
 * Le modèle recevait les écarts et des seuils écrits en toutes lettres ; il en tirait des
 * notes qui contredisaient les chiffres (« moins bonne » pour Paris 15e, sous son repère
 * sur quatre indicateurs sur cinq). Les seuils sont ceux qu'il avait pour consigne.
 *
 * Le repère est celui de la card : les communes de même taille, ou la France quand la
 * tranche manque. Les indicateurs pèsent selon leur taux local — les plus fréquents font
 * le quotidien du lieu.
 */

/** Écart moyen au repère, en %, sous lequel (en valeur absolue) le lieu est « proche ». */
const PROCHE_PCT = 15;
/** Au-delà, en valeur absolue, l'écart est franc. */
const NET_PCT = 25;

/** Le second repère d'un indicateur, comme dans la card. */
export function secondReference(security: SecurityAnalysisDto, indicator: SecurityIndicatorDto): (number | null)[] {
  return security.tranche !== null && security.tranche !== undefined ? indicator.memeTaille : indicator.france;
}

export function computeSecurityRating(security: SecurityAnalysisDto | null | undefined): SecurityRating | undefined {
  if (!security) return undefined;

  let poids = 0;
  let ecartPondere = 0;
  let evolutionPonderee = 0;
  let poidsEvolution = 0;
  const derniere = (values: (number | null)[]) => (values.length > 0 ? values[values.length - 1] : null);
  for (const indicator of security.indicateurs) {
    // La dernière année, pas la dernière valeur publiée : une année masquée ne doit pas
    // laisser passer le chiffre d'une année plus ancienne.
    const taux = derniere(indicator.commune);
    const ecart = ecartPct(taux, derniere(secondReference(security, indicator)));
    // Une valeur masquée (1 à 4 faits) n'a pas de taux, un zéro ne pèse rien : ni l'un ni
    // l'autre n'entre dans la note.
    if (taux === null || taux <= 0 || ecart === null) continue;
    poids += taux;
    ecartPondere += taux * ecart;
    const evolution = ecartPct(taux, firstNumber(indicator.commune));
    if (evolution !== null) {
      poidsEvolution += taux;
      evolutionPonderee += taux * evolution;
    }
  }
  // Rien de publié (petite commune sous secret) : pas de note plutôt qu'une note inventée.
  if (poids === 0) return undefined;

  const ecart = ecartPondere / poids;
  const sens = tendance(poidsEvolution > 0 ? evolutionPonderee / poidsEvolution : null);

  if (ecart <= -NET_PCT) return sens === "en hausse" ? "bon" : "excellent";
  if (ecart < -PROCHE_PCT) return "bon";
  if (ecart < PROCHE_PCT) return sens === "en baisse" ? "bon" : sens === "en hausse" ? "mediocre" : "moyen";
  if (ecart < NET_PCT) return "mediocre";
  return sens === "en baisse" ? "mediocre" : "mauvais";
}
