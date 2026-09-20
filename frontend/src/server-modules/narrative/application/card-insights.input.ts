/**
 * Réduction du DTO d'analyse au strict nécessaire pour rédiger les mini-synthèses.
 *
 * Deux règles gouvernent ce fichier.
 *
 * 1. **On calcule, le modèle verbalise.** Tendances, écarts, extrema et classes
 *    dominantes sont tranchés ici, en TypeScript, sur des seuils explicites. Le modèle
 *    reçoit « en baisse de 31 % » et non dix nombres à comparer.
 *
 * 2. **Une clé est présente si et seulement si sa card est rendue.** Chaque réducteur
 *    réplique la garde de sa card. Une clé produite pour une card absente donnerait une
 *    phrase orpheline ; une clé omise pour une card présente donnerait une card muette.
 */

import { AGE_BUCKETS } from "@/components/analysis/ageChart";
import { CLIMATE_METRICS, MONTH_NAMES } from "@/components/analysis/climateChart";
import { NUANCE_LABEL, PARTI_LABEL } from "@/components/analysis/electionLabels";
import { viewForMode } from "@/components/analysis/inseeChart";
import { baseLabel, isArrondissement } from "@/components/analysis/securityChart";
import type { CardInsightKey } from "@/server-shared/types/card-insights";
import { CARD_INSIGHT_KEYS } from "@/server-shared/types/card-insights";
import type {
  ClimateAnalysisDto,
  ClimateMonthlySeriesDto,
  DemographicsAnalysisDto,
  ElectionsAnalysisDto,
  EmploymentStatsDto,
  HousingStatsDto,
  HouseholdsStatsDto,
  LocationAnalysisDto,
  MunicipalesAnalysisDto,
  SecurityAnalysisDto,
} from "@/server-shared/types/location-analysis.dto";
import type {
  CardInsightsInput,
  ClasseDominante,
  ClimatInsightInput,
  DemographieInsightInput,
  ElectionsInsightInput,
  EmploiInsightInput,
  IndicateurCompare,
  LogementInsightInput,
  MenagesInsightInput,
  MunicipalesInsightInput,
  PartCompare,
  SecuriteInsightInput,
} from "../domain/card-insights.types";
import {
  ecartPct,
  ecartRelatif,
  firstNumber,
  lastNumber,
  round,
  roundOrNull,
  tendance,
} from "@/server-shared/domain/trend";

/**
 * Libellés complets des catégories.
 *
 * Les cards utilisent des abréviations taillées pour un axe de graphe (« Artis. »,
 * « +3/4 », « <1919 ») : lisibles sous une barre, illisibles dans une phrase. On les
 * redonne en toutes lettres, dans le même ordre que les séries du DTO.
 */
export const ROOM_LABELS = ["1 pièce", "2 pièces", "3 pièces", "4 pièces", "5 pièces et plus"];
export const EPOCH_LABELS = [
  "avant 1919", "1919-1945", "1946-1970", "1971-1990", "1991-2005", "2006-2018",
];
const CSP_LABELS = [
  "agriculteurs", "artisans et commerçants", "cadres et professions intellectuelles",
  "professions intermédiaires", "employés", "ouvriers",
];
const DIPLOMA_LABELS = [
  "sans diplôme", "BEPC", "CAP-BEP", "baccalauréat", "bac+2", "bac+3/4", "bac+5 et plus",
];
const CHILDREN_LABELS = [
  "aucun enfant", "1 enfant", "2 enfants", "3 enfants", "4 enfants et plus",
];

// --- Petits utilitaires -----------------------------------------------------
//
// `round`, `ecartPct`, `firstNumber`, `lastNumber` et le seuil de tendance vivent dans
// `server-shared/domain/trend.ts` : les pages commune SEO tranchent leurs écarts de
// sécurité avec les mêmes règles.

/** Écart en points entre deux parts. `null` dès qu'un des deux termes manque. */
function ecartPts(local: number | null | undefined, france: number | null | undefined): number | null {
  if (local === null || local === undefined || france === null || france === undefined) return null;
  return round(local - france);
}

/**
 * La classe la plus représentée d'une distribution, avec son écart au national.
 *
 * Rend `null` si la série locale manque : sans elle il n'y a pas de graphe à l'écran
 * non plus (`buildDistributionModel` rend `null` dans le même cas).
 *
 * Exportée pour le prompt des pages commune : les deux pipelines doivent trancher la
 * classe dominante par le même code, sous peine de se contredire sur la même page.
 */
export function classeDominante(
  local: (number | null)[] | null | undefined,
  france: (number | null)[] | null | undefined,
  labels: string[],
): ClasseDominante | null {
  if (!local || local.length === 0) return null;

  let bestIndex = -1;
  let bestValue = -Infinity;
  local.forEach((v, i) => {
    if (v !== null && v > bestValue) {
      bestValue = v;
      bestIndex = i;
    }
  });
  if (bestIndex === -1) return null;

  const pctFrance = france?.[bestIndex] ?? null;
  return {
    classe: labels[bestIndex] ?? `classe ${bestIndex + 1}`,
    pct_local: round(bestValue),
    pct_france: roundOrNull(pctFrance),
    ecart_pts: ecartPts(bestValue, pctFrance),
  };
}

function indicateur(
  libelle: string,
  unite: string,
  local: number | null | undefined,
  france: number | null | undefined,
  mode: "pts" | "pct",
): IndicateurCompare {
  return {
    libelle,
    unite,
    valeur_locale: roundOrNull(local),
    valeur_france: roundOrNull(france),
    ...(mode === "pts" ? { ecart_pts: ecartPts(local, france) } : { ecart_pct: ecartPct(local, france) }),
  };
}

/** Ne garde que les indicateurs dont la valeur locale existe — le reste est du bruit. */
function keepMeasured(list: IndicateurCompare[]): IndicateurCompare[] {
  return list.filter((i) => i.valeur_locale !== null);
}

// --- Sécurité ---------------------------------------------------------------

function buildSecurite(
  security: SecurityAnalysisDto | null | undefined,
  codeInsee: string | undefined,
): SecuriteInsightInput | undefined {
  // Garde de SecurityCard : sans indicateur, pas de card.
  if (!security || security.indicateurs.length === 0) return undefined;

  const { annees, indicateurs } = security;
  return {
    maille: isArrondissement(codeInsee) ? "arrondissement" : "commune",
    periode: `${annees[0]}–${annees[annees.length - 1]}`,
    indicateurs: indicateurs.map((ind) => {
      const debut = firstNumber(ind.commune);
      const fin = lastNumber(ind.commune);
      const evolution = ecartPct(fin, debut);
      const vsDepartement = ecartRelatif(fin, lastNumber(ind.departement));
      const vsFrance = ecartRelatif(fin, lastNumber(ind.france));

      return {
        indicateur: ind.indicateur,
        unite: `faits ${baseLabel(ind.base)}`,
        taux_derniere_annee: roundOrNull(fin, 2),
        tendance_10ans: tendance(evolution),
        evolution_10ans_pct: evolution,
        ecart_vs_departement_pct: vsDepartement.pct,
        multiple_vs_departement: vsDepartement.multiple,
        ecart_vs_france_pct: vsFrance.pct,
        multiple_vs_france: vsFrance.multiple,
        annees_masquees: ind.commune.filter((v) => v === null).length,
      };
    }),
  };
}

// --- Démographie ------------------------------------------------------------

function buildDemographie(
  demographics: DemographicsAnalysisDto | null,
  mode: LocationAnalysisDto["mode"],
): DemographieInsightInput | undefined {
  if (!demographics) return undefined;

  // Même arbitrage que DemographicsCard : en mode commune l'IRIS du centroïde n'a pas
  // de sens, la commune devient la série principale.
  const isCommune = mode === "commune";
  const local = isCommune
    ? demographics.communeStats
    : {
        population: demographics.population,
        density: demographics.density,
        ageDistribution: demographics.ageDistribution,
        revenuMedian: demographics.revenuMedian,
        tauxPauvrete: demographics.tauxPauvrete,
      };
  const france = demographics.nationalStats;

  if (!local) return undefined;

  const ages = local.ageDistribution;
  const agesFrance = france?.ageDistribution ?? null;
  const tranches = ages
    ? AGE_BUCKETS.map((b) => ({
        tranche: `${b.label} ans`,
        pct_local: round(ages[b.key]),
        pct_france: roundOrNull(agesFrance?.[b.key] ?? null),
        ecart_pts: ecartPts(ages[b.key], agesFrance?.[b.key] ?? null),
      }))
    : [];

  // Les tranches saillantes, tranchées ici : c'est la lecture du graphe, et elle est
  // fausse une fois sur deux quand on la laisse au modèle.
  const withEcart = tranches.filter((t) => t.ecart_pts !== null);
  const sorted = [...withEcart].sort((a, b) => (b.ecart_pts ?? 0) - (a.ecart_pts ?? 0));

  const indicateurs = keepMeasured([
    indicateur("Revenu médian", "€/an", local.revenuMedian, france?.revenuMedian, "pct"),
    indicateur("Taux de pauvreté", "%", local.tauxPauvrete, france?.tauxPauvrete, "pts"),
  ]);

  if (indicateurs.length === 0 && tranches.length === 0 && local.population === null) {
    return undefined;
  }

  return {
    population: local.population,
    densite_hab_km2: roundOrNull(local.density, 0),
    indicateurs,
    tranches_age: tranches,
    tranche_sur_representee: sorted.length > 0 ? sorted[0].tranche : null,
    tranche_sous_representee: sorted.length > 1 ? sorted[sorted.length - 1].tranche : null,
  };
}

// --- Logement ---------------------------------------------------------------

function buildLogement(
  demographics: DemographicsAnalysisDto | null,
  mode: LocationAnalysisDto["mode"],
): LogementInsightInput | undefined {
  if (!demographics) return undefined;
  const view = viewForMode<HousingStatsDto>(demographics.housing, mode, demographics);
  if (!view) return undefined;

  const local = view.scoped.iris;
  const france = view.scoped.france;
  if (!local) return undefined;

  const statut: PartCompare[] = [
    { libelle: "propriétaires", pct_local: roundOrNull(local.pctProprietaires), pct_france: roundOrNull(france?.pctProprietaires) },
    { libelle: "locataires du privé", pct_local: roundOrNull(local.pctLocatairesPrives), pct_france: roundOrNull(france?.pctLocatairesPrives) },
    { libelle: "logement social (HLM)", pct_local: roundOrNull(local.pctHlm), pct_france: roundOrNull(france?.pctHlm) },
    { libelle: "logés gratuitement", pct_local: roundOrNull(local.pctLogesGratuitement), pct_france: roundOrNull(france?.pctLogesGratuitement) },
  ].filter((p) => p.pct_local !== null);

  return {
    logements: local.logements,
    indicateurs: keepMeasured([
      indicateur("Maisons", "%", local.pctMaisons, france?.pctMaisons, "pts"),
      indicateur("Appartements", "%", local.pctAppartements, france?.pctAppartements, "pts"),
      indicateur("Logements vacants", "%", local.pctVacants, france?.pctVacants, "pts"),
      indicateur("Résidences secondaires", "%", local.pctResidencesSecondaires, france?.pctResidencesSecondaires, "pts"),
    ]),
    statut_occupation: statut,
    pieces_dominant: classeDominante(local.pieces, france?.pieces, ROOM_LABELS),
    epoques_dominant: classeDominante(local.epoques, france?.epoques, EPOCH_LABELS),
  };
}

// --- Emploi -----------------------------------------------------------------

function buildEmploi(
  demographics: DemographicsAnalysisDto | null,
  mode: LocationAnalysisDto["mode"],
): EmploiInsightInput | undefined {
  if (!demographics) return undefined;
  const view = viewForMode<EmploymentStatsDto>(demographics.employment, mode, demographics);
  if (!view) return undefined;

  const local = view.scoped.iris;
  const france = view.scoped.france;
  if (!local) return undefined;

  return {
    indicateurs: keepMeasured([
      indicateur("Taux de chômage (recensement, déclaratif)", "%", local.tauxChomage, france?.tauxChomage, "pts"),
      indicateur("Taux d'activité", "%", local.tauxActivite, france?.tauxActivite, "pts"),
      indicateur("Diplômés du supérieur (bac+2 et plus)", "%", local.pctDiplomesSuperieur, france?.pctDiplomesSuperieur, "pts"),
    ]),
    csp_dominante: classeDominante(local.csp, france?.csp, CSP_LABELS),
    diplome_dominant: classeDominante(local.diplomes, france?.diplomes, DIPLOMA_LABELS),
  };
}

// --- Ménages ----------------------------------------------------------------

function buildMenages(
  demographics: DemographicsAnalysisDto | null,
  mode: LocationAnalysisDto["mode"],
): MenagesInsightInput | undefined {
  if (!demographics) return undefined;
  const view = viewForMode<HouseholdsStatsDto>(demographics.households, mode, demographics);
  if (!view) return undefined;

  const local = view.scoped.iris;
  const france = view.scoped.france;
  if (!local) return undefined;

  const composition: PartCompare[] = [
    { libelle: "personnes seules", pct_local: roundOrNull(local.pctPersonnesSeules), pct_france: roundOrNull(france?.pctPersonnesSeules) },
    { libelle: "couples sans enfant", pct_local: roundOrNull(local.pctCouplesSansEnfant), pct_france: roundOrNull(france?.pctCouplesSansEnfant) },
    { libelle: "couples avec enfants", pct_local: roundOrNull(local.pctCouplesAvecEnfants), pct_france: roundOrNull(france?.pctCouplesAvecEnfants) },
    { libelle: "familles monoparentales", pct_local: roundOrNull(local.pctFamillesMonoparentales), pct_france: roundOrNull(france?.pctFamillesMonoparentales) },
  ].filter((p) => p.pct_local !== null);

  return {
    indicateurs: keepMeasured([
      indicateur("Taille moyenne des ménages", "personnes", local.tailleMoyenne, france?.tailleMoyenne, "pts"),
    ]),
    composition,
    enfants_dominant: classeDominante(local.enfantsParFamille, france?.enfantsParFamille, CHILDREN_LABELS),
  };
}

// --- Élections --------------------------------------------------------------

function buildElections(
  elections: ElectionsAnalysisDto | null | undefined,
): ElectionsInsightInput | undefined {
  if (!elections) return undefined;

  // Les trois premiers suffisent : au-delà, les écarts au national sont dans le bruit
  // et le modèle est tenté d'énumérer. Même arbitrage que le prompt commune.
  const top = [...elections.candidates]
    .sort((a, b) => b.pctCommune - a.pctCommune)
    .slice(0, 3)
    .map((c) => ({
      candidat: c.candidat,
      // Le libellé, pas le code : « Rassemblement national » et non « RN ». Le modèle ne
      // peut pas développer un sigle qu'il ne reçoit pas, et le prompt lui interdit d'en
      // écrire.
      parti: PARTI_LABEL[c.parti] ?? c.parti,
      pct_local: round(c.pctCommune),
      pct_national: round(c.pctNational),
      ecart_pts: round(c.pctCommune - c.pctNational),
    }));

  return {
    scrutin: "Présidentielle 2022, 1er tour",
    participation_pct: round(elections.participationPct),
    participation_france_pct: round(elections.nationalParticipationPct),
    ecart_participation_pts: round(elections.participationPct - elections.nationalParticipationPct),
    candidats: top,
  };
}

// --- Municipales ------------------------------------------------------------

function buildMunicipales(
  municipales: MunicipalesAnalysisDto | null | undefined,
): MunicipalesInsightInput | undefined {
  // Garde de MunicipalesCard : sans liste, pas de card.
  if (!municipales || municipales.listes.length === 0) return undefined;

  // Les trois premières, comme pour la présidentielle : au-delà, les scores sont dans le
  // bruit et le modèle est tenté d'énumérer.
  const top = [...municipales.listes]
    .sort((a, b) => b.pctExprimes - a.pctExprimes)
    .slice(0, 3)
    .map((l) => ({
      // La tête de liste plutôt que le libellé officiel quand elle existe : c'est le nom
      // sous lequel la card la présente.
      liste: l.teteDeListe ?? l.libelle,
      // Idem : « Divers droite » et non « LDVD ».
      nuance: l.nuance ? (NUANCE_LABEL[l.nuance] ?? l.nuance) : null,
      pct_local: round(l.pctExprimes),
      pct_national: l.pctNational === null ? null : round(l.pctNational),
      ecart_pts: l.pctNational === null ? null : round(l.pctExprimes - l.pctNational),
      sieges: l.siegesCm,
    }));

  return {
    scrutin: `Municipales 2026, ${municipales.tour === 1 ? "1er" : "2e"} tour`,
    ville_entiere: municipales.villeEntiere,
    participation_pct: round(municipales.participationPct),
    nuancee: municipales.nuancee,
    listes: top,
  };
}

// --- Climat -----------------------------------------------------------------

function extremum(values: (number | null)[], direction: "max" | "min") {
  let bestIndex = -1;
  let best = direction === "max" ? -Infinity : Infinity;
  values.forEach((v, i) => {
    if (v === null) return;
    if (direction === "max" ? v > best : v < best) {
      best = v;
      bestIndex = i;
    }
  });
  return bestIndex === -1 ? null : { mois: MONTH_NAMES[bestIndex], valeur: best };
}

function sum(values: (number | null)[]): number | null {
  const measured = values.filter((v): v is number => v !== null);
  return measured.length === 0 ? null : measured.reduce((a, b) => a + b, 0);
}

function mean(values: (number | null)[]): number | null {
  const measured = values.filter((v): v is number => v !== null);
  return measured.length === 0 ? null : measured.reduce((a, b) => a + b, 0) / measured.length;
}

/**
 * Écart minimal, en relatif, entre le meilleur repère et le suivant pour que le premier
 * soit désigné.
 *
 * Mesuré, pas choisi. Depuis que Brest tient le pôle océanique à la place de La Rochelle,
 * les trois repères sont trois extrêmes et le milieu de la France ne ressemble
 * franchement à aucun : sans seuil, le moins éloigné l'emporte quand même, et Caen sort
 * « continental », l'Orne « méditerranéen ». Rejoué sur les 2 895 stations de la base,
 * 5 % est la première valeur qui fait taire ces deux-là ; elle laisse 16 % des stations
 * sans repère désigné, et garde Nantes en océanique.
 */
const ECART_MINIMAL_ENTRE_REPERES = 0.05;

/**
 * Type de climat de référence dont le profil annuel ressemble le plus au profil local —
 * `null` quand aucun ne se détache.
 *
 * Erreur moyenne absolue sur les trois mesures, chacune normalisée par son amplitude
 * propre — sans quoi les précipitations (centaines de mm) écraseraient la température
 * (dizaines de °C). Une mesure absente d'un côté ou de l'autre est ignorée.
 *
 * On renvoie le type de climat, pas la ville-station : c'est le mot que la phrase doit
 * employer. La ville ne sert que de repli si la référence n'est pas typée.
 */
function climatLePlusProche(
  local: ClimateMonthlySeriesDto,
  references: ClimateMonthlySeriesDto[],
): string | null {
  const scores: Array<{ nom: string; score: number }> = [];

  for (const ref of references) {
    let total = 0;
    let count = 0;

    for (const metric of CLIMATE_METRICS) {
      const localSerie = local[metric.key];
      const refSerie = ref[metric.key];

      // Amplitude observée sur les deux séries : le dénominateur de la normalisation.
      const all = [...localSerie, ...refSerie].filter((v): v is number => v !== null);
      if (all.length === 0) continue;
      const span = Math.max(...all) - Math.min(...all);
      if (span === 0) continue;

      for (let i = 0; i < 12; i++) {
        const a = localSerie[i];
        const b = refSerie[i];
        if (a === null || b === null) continue;
        total += Math.abs(a - b) / span;
        count++;
      }
    }

    if (count === 0) continue;
    scores.push({ nom: ref.climateType ?? ref.name, score: total / count });
  }

  if (scores.length === 0) return null;
  scores.sort((a, b) => a.score - b.score);

  // Un seul repère mesurable : rien à départager, il s'impose.
  const suivant = scores[1];
  if (!suivant) return scores[0].nom;

  // Deux repères à égalité ne désignent rien. Mieux vaut que la phrase décrive le climat
  // local sans le rattacher à un pôle que de le rattacher au mauvais.
  return scores[0].score <= suivant.score * (1 - ECART_MINIMAL_ENTRE_REPERES)
    ? scores[0].nom
    : null;
}

function buildClimat(climate: ClimateAnalysisDto | null | undefined): ClimatInsightInput | undefined {
  // Gardes de ClimateCard, dans le même ordre.
  const monthly = climate?.monthly;
  if (!climate || !monthly) return undefined;
  const hasAnyMetric = CLIMATE_METRICS.some((m) => monthly.local[m.key].some((v) => v !== null));
  if (!hasAnyMetric) return undefined;

  const local = monthly.local;
  const tempMax = extremum(local.temperatureC, "max");
  const tempMin = extremum(local.temperatureC, "min");
  const tempMoy = mean(local.temperatureC);
  const precipMax = extremum(local.precipitationMm, "max");
  const precipMin = extremum(local.precipitationMm, "min");
  const precipTotal = sum(local.precipitationMm);
  const soleilTotal = sum(local.sunshineHours);

  return {
    periode: `${climate.periodStart}–${climate.periodEnd}`,
    temperature:
      tempMoy !== null && tempMax && tempMin
        ? {
            moyenne_annuelle_c: round(tempMoy),
            mois_plus_chaud: tempMax.mois,
            c_max: round(tempMax.valeur),
            mois_plus_froid: tempMin.mois,
            c_min: round(tempMin.valeur),
            amplitude_c: round(tempMax.valeur - tempMin.valeur),
          }
        : null,
    precipitations:
      precipTotal !== null && precipMax && precipMin
        ? {
            cumul_annuel_mm: round(precipTotal, 0),
            mois_plus_humide: precipMax.mois,
            mm_max: round(precipMax.valeur, 0),
            mois_plus_sec: precipMin.mois,
            mm_min: round(precipMin.valeur, 0),
          }
        : null,
    ensoleillement: soleilTotal !== null ? { cumul_annuel_h: round(soleilTotal, 0) } : null,
    climats_reference: monthly.references.map((r) => ({
      type_climat: r.climateType ?? r.name,
      temp_annuelle_c: roundOrNull(mean(r.temperatureC)),
      precip_annuelles_mm: roundOrNull(sum(r.precipitationMm), 0),
    })),
    climat_de_reference_le_plus_proche: climatLePlusProche(local, monthly.references),
  };
}

// --- Racine -----------------------------------------------------------------

/** Le périmètre décrit, nommé pour le modèle : il commande le sujet des phrases. */
function buildPerimetre(data: LocationAnalysisDto): string {
  if (data.mode === "commune") {
    return `Commune de ${data.address.city || data.address.label}`;
  }
  const quartier = data.demographics?.nomIris;
  const ville = data.address.city || data.demographics?.nomCommune || "";
  return quartier ? `Quartier ${quartier} — ${ville}` : `Adresse : ${data.address.label}`;
}

export function buildCardInsightsInput(
  data: LocationAnalysisDto,
  codeInsee?: string,
): CardInsightsInput {
  return {
    mode: data.mode,
    perimetre: buildPerimetre(data),
    securite: buildSecurite(data.security, codeInsee),
    demographie: buildDemographie(data.demographics, data.mode),
    logement: buildLogement(data.demographics, data.mode),
    emploi: buildEmploi(data.demographics, data.mode),
    menages: buildMenages(data.demographics, data.mode),
    elections: buildElections(data.elections),
    municipales: buildMunicipales(data.municipales),
    climat: buildClimat(data.climate),
  };
}

/**
 * Les clés que le modèle doit produire : celles, et seulement celles, dont le réducteur
 * a rendu des données. Sert à la fois au prompt (`cles_attendues`) et au parseur, qui
 * ignore tout ce qui déborde.
 */
export function expectedKeys(input: CardInsightsInput): CardInsightKey[] {
  return CARD_INSIGHT_KEYS.filter((key) => input[key] !== undefined);
}
