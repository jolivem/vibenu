import { baseLabel } from "@/components/analysis/securityChart";
import {
  ecartPct,
  ecartRelatif,
  firstNumber,
  lastNumber,
  tendance,
  type EcartRelatif,
  type Tendance,
} from "@/server-shared/domain/trend";
import type { SecurityStats } from "../domain/commune-stats.types";

/** Un indicateur de délinquance, réduit à ce que le tableau, la FAQ et la légende IA disent. */
export interface SecurityIndicatorSummary {
  indicateur: string;
  /** « pour 1 000 logements » ou « pour 1 000 habitants ». */
  unite: string;
  /** Dernière année de la série. */
  annee: number;
  /** Taux de la dernière année, `null` si masqué ou absent. */
  tauxLocal: number | null;
  /** Dernière année sous secret statistique : 1 à 4 faits, taux non publié. */
  masque: boolean;
  tauxVille: number | null;
  tauxFrance: number | null;
  /** En pourcentage, ou en multiple dès le double du repère. */
  ecartVille: EcartRelatif;
  ecartFrance: EcartRelatif;
  /** Première et dernière valeurs publiées, comme les « En bref » de l'analyse. */
  tendance10ans: Tendance | null;
  evolution10ansPct: number | null;
  anneesMasquees: number;
}

/**
 * Écarts et tendances de chaque indicateur, calculés une fois pour la section, la FAQ et la
 * narrative : les trois ne peuvent pas se contredire sur un chiffre.
 *
 * Les écarts portent sur la même année, la dernière. Une année masquée n'a pas d'écart :
 * « 1 à 4 faits » ne se compare pas à un taux.
 */
export function summarizeSecurity(securite: SecurityStats): SecurityIndicatorSummary[] {
  const { local, ville } = securite;
  const last = local.annees.length - 1;
  const annee = local.annees[last];

  return local.indicateurs.map((ind) => {
    const villeInd = ville?.indicateurs.find((v) => v.indicateur === ind.indicateur);
    const tauxLocal = ind.commune[last] ?? null;
    const tauxVille = villeInd?.commune[last] ?? null;
    const tauxFrance = ind.france[last] ?? null;
    const evolution = ecartPct(lastNumber(ind.commune), firstNumber(ind.commune));

    return {
      indicateur: ind.indicateur,
      unite: baseLabel(ind.base),
      annee,
      tauxLocal,
      masque: tauxLocal === null && ind.borneBasse[last] != null,
      tauxVille,
      tauxFrance,
      ecartVille: ecartRelatif(tauxLocal, tauxVille),
      ecartFrance: ecartRelatif(tauxLocal, tauxFrance),
      tendance10ans: tendance(evolution),
      evolution10ansPct: evolution,
      anneesMasquees: ind.commune.filter((v) => v === null).length,
    };
  });
}
