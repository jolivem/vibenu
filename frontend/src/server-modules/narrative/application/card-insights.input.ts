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
import { EU_LIMITS, airTrend } from "@/components/analysis/airQualityModel";
import { CLIMATE_METRICS } from "@/components/analysis/climateChart";
import { viewForMode } from "@/components/analysis/inseeChart";
import { hasLocalTaxContent, summarizeFinance } from "@/components/analysis/localTaxModel";
import { isArrondissement } from "@/components/analysis/securityChart";
import type { Locale } from "@/i18n/locales";
import type { AnalysisMessages } from "@/i18n/messages/fr/analysis";
import { getAnalysisMessages } from "@/i18n/server";
import { FEATURES } from "@/lib/site-features";
import type { CardInsightKey } from "@/server-shared/types/card-insights";
import { CARD_INSIGHT_KEYS } from "@/server-shared/types/card-insights";
import type {
  AirQualityAnalysisDto,
  AnnualPollutantStatDto,
  ClimateAnalysisDto,
  ClimateMonthlySeriesDto,
  DemographicsAnalysisDto,
  ElectionsAnalysisDto,
  EmploymentStatsDto,
  HousingStatsDto,
  HouseholdsStatsDto,
  LocalTaxAnalysisDto,
  LocationAnalysisDto,
  MunicipalesAnalysisDto,
  SecurityAnalysisDto,
} from "@/server-shared/types/location-analysis.dto";
import type {
  AirInsightInput,
  AirPolluantInput,
  CardInsightsInput,
  PositionAir,
  ClasseDominante,
  ClimatInsightInput,
  DemographieInsightInput,
  ElectionsInsightInput,
  EmploiInsightInput,
  FiscaliteInsightInput,
  PositionFiscale,
  IndicateurCompare,
  LogementInsightInput,
  MenagesInsightInput,
  MunicipalesInsightInput,
  PartCompare,
  SecuriteInsightInput,
} from "../domain/card-insights.types";
import { createFormat } from "@/i18n/format";
import { secondReference } from "./security-rating";
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
export const CSP_LABELS = [
  "agriculteurs", "artisans et commerçants", "cadres et professions intellectuelles",
  "professions intermédiaires", "employés", "ouvriers",
];
export const DIPLOMA_LABELS = [
  "sans diplôme", "BEPC", "CAP-BEP", "baccalauréat", "bac+2", "bac+3/4", "bac+5 et plus",
];
export const CHILDREN_LABELS = [
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

// --- Fiscalité locale -------------------------------------------------------

/**
 * Seuils de position face à la médiane des communes de France, en points de taux.
 *
 * Calés sur la distribution 2025 du taux global de taxe foncière : médiane 40,33 %,
 * quartiles 34,86 % et 46,09 %. À 6 points de la médiane, une commune est donc sortie de
 * la moitié centrale ; à moins de 2, elle ne s'en distingue pas.
 */
const FISCALITE_PROCHE_PTS = 2;
const FISCALITE_NETTEMENT_PTS = 6;

/** En deçà d'un point sur la période, un taux est dit stable. */
const FISCALITE_STABLE_PTS = 1;

/** Écart relatif de dette à partir duquel elle mérite d'être dite. */
const DETTE_ECART_NOTABLE_PCT = 20;

function positionFiscale(ecartPts: number | null): PositionFiscale | null {
  if (ecartPts === null) return null;
  const abs = Math.abs(ecartPts);
  if (abs < FISCALITE_PROCHE_PTS) return "proche";
  const sens = ecartPts > 0 ? "au-dessus" : "en dessous";
  return abs >= FISCALITE_NETTEMENT_PTS ? `nettement ${sens}` : sens;
}

function buildFiscalite(localTax: LocalTaxAnalysisDto | null | undefined): FiscaliteInsightInput | undefined {
  // Garde de LocalTaxCard, drapeau compris : la card peut être coupée par variante.
  if (!FEATURES.showLocalTax || !hasLocalTaxContent(localTax)) return undefined;

  const { taxeFonciere, residencesSecondaires, dmto, finances } = localTax;
  const input: FiscaliteInsightInput = { ville_entiere: localTax.villeEntiere };

  const dernier = taxeFonciere ? taxeFonciere.annees.length - 1 : -1;
  const taux = taxeFonciere && dernier >= 0 ? taxeFonciere.tauxGlobal[dernier] : null;
  if (taxeFonciere && taux !== null) {
    const france = taxeFonciere.medianeFrance[dernier];
    const departement = taxeFonciere.medianeDepartement[dernier];
    const evolution = ecartPts(taux, firstNumber(taxeFonciere.tauxGlobal));

    input.taxe_fonciere = {
      annee: taxeFonciere.annees[dernier],
      taux_pct: taux,
      mediane_communes_france_pct: france,
      ecart_mediane_france_pts: ecartPts(taux, france),
      position_vs_mediane_france: positionFiscale(ecartPts(taux, france)),
      mediane_communes_departement_pct: departement,
      ecart_mediane_departement_pts: ecartPts(taux, departement),
      periode: `${taxeFonciere.annees[0]}–${taxeFonciere.annees[dernier]}`,
      evolution_pts: dernier > 0 ? evolution : null,
      tendance:
        dernier > 0 && evolution !== null
          ? evolution > FISCALITE_STABLE_PTS
            ? "en hausse"
            : evolution < -FISCALITE_STABLE_PTS
              ? "en baisse"
              : "stable"
          : null,
      ordures_menageres: taxeFonciere.teom ? { taux_pct: taxeFonciere.teom.taux } : "aucune taxe publiée",
    };
  }

  const majoration = residencesSecondaires?.majoration;
  if (majoration?.appliquee && majoration.tauxPct !== null) {
    input.majoration_residences_secondaires_pct = majoration.tauxPct;
  }
  if (residencesSecondaires?.tlv?.soumise) input.zone_taxe_logements_vacants = true;

  // Sous le taux le plus courant, il n'y a plus de taux réduit pour les primo-accédants.
  if (dmto && dmto.tauxPrimoAccedant === null) {
    input.droits_mutation = {
      taux_departemental_pct: dmto.tauxDepartemental,
      inferieur_au_taux_le_plus_courant: true,
    };
  }

  const detteSerie = finances?.indicateurs.find((ind) => ind.cle === "dette");
  const dette = finances && detteSerie ? summarizeFinance(finances, detteSerie) : null;
  if (dette && dette.moyenneStrate !== null) {
    const ecart = ecartPct(dette.parHabitant, dette.moyenneStrate);
    if (ecart !== null && Math.abs(ecart) >= DETTE_ECART_NOTABLE_PCT) {
      const relatif = ecartRelatif(dette.parHabitant, dette.moyenneStrate);
      input.dette_par_habitant = {
        eur: round(dette.parHabitant, 0),
        moyenne_communes_comparables_eur: round(dette.moyenneStrate, 0),
        ecart_pct: relatif.pct,
        multiple: relatif.multiple,
      };
    }
  }

  return input;
}

// --- Sécurité ---------------------------------------------------------------

/** Indicateurs transmis au modèle : ceux que la phrase commente, et rien d'autre. */
const SECURITE_INDICATEURS_RETENUS = 2;
/** À partir de ce nombre d'indicateurs masqués ou à zéro la dernière année, les faits sont « rares ». */
const SECURITE_FAITS_RARES_MIN = 3;

/** La valeur de la dernière année, `null` si elle est masquée — jamais une année antérieure. */
function derniere(values: (number | null)[]): number | null {
  return values.length > 0 ? values[values.length - 1] : null;
}

/** Sous ce seuil, en valeur absolue, l'écart se dit « proche ». */
const SECURITE_PROCHE_PCT = 5;
const fr = createFormat("fr");

/**
 * La comparaison d'un taux à un repère, rédigée ici plutôt que par le modèle, qui
 * confondait les repères. Formulée sur « taux » pour ne pas avoir à accorder avec le nom de
 * l'indicateur (« cambriolages », « destructions »…). `repere` porte son article : « du
 * département », « des communes de même taille », « de la France ».
 */
function positionSecurite(ecart: { pct: number | null; multiple: number | null }, repere: string): string | null {
  if (ecart.multiple !== null) return `taux ${fr.decimal(ecart.multiple, 1)} fois celui ${repere}`;
  if (ecart.pct === null) return null;
  if (Math.abs(ecart.pct) < SECURITE_PROCHE_PCT) return `taux proche de celui ${repere}`;
  const sens = ecart.pct > 0 ? "supérieur" : "inférieur";
  return `taux ${sens} de ${fr.int(Math.abs(ecart.pct))} % à celui ${repere}`;
}

function buildSecurite(
  security: SecurityAnalysisDto | null | undefined,
  codeInsee: string | undefined,
  m: AnalysisMessages,
): SecuriteInsightInput | undefined {
  // Garde de SecurityCard : sans indicateur, pas de card.
  if (!security || security.indicateurs.length === 0) return undefined;

  const { annees, indicateurs, tranche, codeDepartement } = security;
  // Même second repère que la card : les communes de même taille, ou la France sans tranche.
  const memeTaille = tranche !== null && tranche !== undefined;
  // Les repères sont nommés en clair, en français comme le reste de l'entrée : « communes de
  // même taille » se confondait avec Paris pour un arrondissement parisien. À Paris, le
  // département est la ville : on le dit.
  const groupe = memeTaille ? getAnalysisMessages("fr").security.sizeGroup[tranche] : null;
  const repereDepartement = codeDepartement === "75" ? "de Paris" : "du département";

  const derniereAnnee = annees[annees.length - 1];

  // Toujours la valeur de la DERNIÈRE année, jamais la dernière publiée : à Mons-en-Montois,
  // un 0 de 2022 passait pour la valeur de 2025, masquée (1 à 4 faits), et le modèle
  // concluait à des vols « inexistants ». Une année masquée n'a pas de taux ; un zéro publié
  // n'a pas d'écart qui se lise (« inférieur de 100 % »). Les deux reçoivent un état rédigé.
  const lignes = indicateurs.map((ind) => {
    const fin = derniere(ind.commune);
    const etat =
      fin === null
        ? `entre 1 et 4 faits enregistrés en ${derniereAnnee} (chiffre exact non publié)`
        : fin === 0
          ? `aucun fait enregistré en ${derniereAnnee}`
          : null;
    const ecart = etat ? null : ecartPct(fin, derniere(secondReference(security, ind)));
    const ecartDep = etat ? null : ecartPct(fin, derniere(ind.departement));
    // Rang : les écarts les plus nets d'abord, puis les années masquées, puis les zéros.
    const score = etat ? (fin === null ? -1 : -2) : Math.abs(ecart ?? ecartDep ?? 0);
    return { ind, fin, etat, score };
  });
  // Les indicateurs à commenter sont choisis ici, pas par le modèle : il en prenait un
  // « plus fréquent qu'ailleurs » qui était sous ses deux repères. On garde les plus
  // éloignés du second repère — ce que la card met en regard.
  const retenus = [...lignes].sort((a, b) => b.score - a.score).slice(0, SECURITE_INDICATEURS_RETENUS);
  const faitsRares = lignes.filter((l) => l.etat !== null).length >= SECURITE_FAITS_RARES_MIN;

  return {
    maille: isArrondissement(codeInsee) ? "arrondissement" : "commune",
    periode: `${annees[0]}–${derniereAnnee}`,
    ...(groupe ? { libelle_meme_taille: groupe } : {}),
    ...(faitsRares ? { faits_rares: true } : {}),
    indicateurs: retenus.map(({ ind, fin, etat }) => {
      // Une tendance sur dix ans ne se lit qu'entre deux valeurs publiées non nulles : sur
      // un ou deux faits, elle ne mesure que le hasard.
      const evolution = etat ? null : ecartPct(fin, firstNumber(ind.commune));
      const vsDepartement = ecartRelatif(fin, derniere(ind.departement));
      const vsSecond = ecartRelatif(fin, derniere(secondReference(security, ind)));

      return {
        indicateur: ind.indicateur,
        unite: m.security.insightUnit(m.security.base[ind.base]),
        taux_derniere_annee: roundOrNull(fin, 2),
        ...(etat ? { etat_derniere_annee: etat } : {}),
        tendance_10ans: tendance(evolution),
        evolution_10ans_pct: evolution,
        position_vs_departement: etat ? null : positionSecurite(vsDepartement, repereDepartement),
        ...(groupe
          ? { position_vs_meme_taille: etat ? null : positionSecurite(vsSecond, `des ${groupe}`) }
          : { position_vs_france: etat ? null : positionSecurite(vsSecond, "de la France") }),
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
  m: AnalysisMessages,
): LogementInsightInput | undefined {
  if (!demographics) return undefined;
  const view = viewForMode<HousingStatsDto>(demographics.housing, mode, demographics, m.population);
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
  m: AnalysisMessages,
): EmploiInsightInput | undefined {
  if (!demographics) return undefined;
  const view = viewForMode<EmploymentStatsDto>(demographics.employment, mode, demographics, m.population);
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
  m: AnalysisMessages,
): MenagesInsightInput | undefined {
  if (!demographics) return undefined;
  const view = viewForMode<HouseholdsStatsDto>(demographics.households, mode, demographics, m.population);
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
  m: AnalysisMessages,
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
      parti: m.elections.parties[c.parti] ?? c.parti,
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
  m: AnalysisMessages,
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
      nuance: l.nuance ? (m.elections.nuances[l.nuance] ?? l.nuance) : null,
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

function extremum(values: (number | null)[], direction: "max" | "min", monthNames: readonly string[]) {
  let bestIndex = -1;
  let best = direction === "max" ? -Infinity : Infinity;
  values.forEach((v, i) => {
    if (v === null) return;
    if (direction === "max" ? v > best : v < best) {
      best = v;
      bestIndex = i;
    }
  });
  return bestIndex === -1 ? null : { mois: monthNames[bestIndex], valeur: best };
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

function buildClimat(climate: ClimateAnalysisDto | null | undefined, m: AnalysisMessages): ClimatInsightInput | undefined {
  // Gardes de ClimateCard, dans le même ordre.
  const monthly = climate?.monthly;
  if (!climate || !monthly) return undefined;
  const hasAnyMetric = CLIMATE_METRICS.some((m) => monthly.local[m.key].some((v) => v !== null));
  if (!hasAnyMetric) return undefined;

  const local = monthly.local;
  const tempMax = extremum(local.temperatureC, "max", m.climate.monthNames);
  const tempMin = extremum(local.temperatureC, "min", m.climate.monthNames);
  const tempMoy = mean(local.temperatureC);
  const precipMax = extremum(local.precipitationMm, "max", m.climate.monthNames);
  const precipMin = extremum(local.precipitationMm, "min", m.climate.monthNames);
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

// --- Qualité de l'air -------------------------------------------------------

/**
 * Seuils de position face à la moyenne des stations de fond françaises, en relatif. ±15 %
 * reste dans l'écart d'une station à sa voisine ; à +50 %, une valeur sort franchement du
 * lot (Paris 7e en NO₂ : le double de la France).
 */
const AIR_PROCHE_PCT = 15;
const AIR_NETTEMENT_PCT = 50;

/** À moins de 10 % du seuil, une valeur est « au niveau » : la mesure est en µg entiers. */
const AIR_SEUIL_TOLERANCE = 0.1;

function positionAir(ecart: number | null): PositionAir {
  if (ecart === null || Math.abs(ecart) < AIR_PROCHE_PCT) return "proche";
  const sens = ecart > 0 ? "au-dessus" : "en dessous";
  return Math.abs(ecart) >= AIR_NETTEMENT_PCT ? `nettement ${sens}` : sens;
}

function airPolluant(stat: AnnualPollutantStatDto, m: AnalysisMessages): AirPolluantInput {
  const ratio = stat.value / stat.reference;
  const trend = airTrend(stat.history);
  const enJours = stat.unit === "days";
  const limit = EU_LIMITS[stat.code];

  return {
    polluant: m.air.insightPollutants[stat.code],
    unite: enJours ? m.air.insightDaysUnit : "µg/m³",
    valeur: stat.value,
    annee: stat.year,
    moyenne_france: stat.nationalMean,
    position_vs_france: positionAir(ecartPct(stat.value, stat.nationalMean)),
    ...(() => {
      const { multiple } = ecartRelatif(stat.value, stat.nationalMean);
      return multiple !== null ? { multiple_vs_france: multiple } : {};
    })(),
    seuil_reference: {
      nature: stat.referenceKind === "who" ? m.air.insightWhoGuideline : m.air.insightEuTarget,
      valeur: stat.reference,
      // « 1,2 fois la cible » ne se dit pas sur des jours : le multiple est réservé à l'OMS.
      ...(stat.referenceKind === "who" && ratio > 1 + AIR_SEUIL_TOLERANCE ? { multiple: round(ratio) } : {}),
      position:
        ratio < 1 - AIR_SEUIL_TOLERANCE ? "sous" : ratio <= 1 + AIR_SEUIL_TOLERANCE ? "au niveau" : "au-dessus",
    },
    // L'ozone n'a qu'une cible : sa « limite » serait le même seuil, déjà donné.
    ...(stat.referenceKind === "who" ? { limite_ue: { valeur: limit, depassee: stat.value > limit } } : {}),
    ...(trend
      ? {
          tendance: {
            depuis: trend.from,
            tendance: trend.direction === "down" ? "en baisse" : trend.direction === "up" ? "en hausse" : "stable",
            // Sur des jours, un pourcentage exagère : 7 → 20 jours ferait « +173 % ».
            ...(enJours
              ? {
                  evolution_jours: round(trend.endMean - trend.startMean, 0),
                  evolution_france_jours: round(trend.nationalEndMean - trend.nationalStartMean, 0),
                }
              : { evolution_pct: trend.change, evolution_france_pct: trend.nationalChange }),
          },
        }
      : {}),
  };
}

/**
 * Le polluant qui ressort. Un dépassement européen passe d'abord ; entre deux dépassements,
 * l'écart à la France départage — à Paris, le NO₂ au double de la France l'emporte sur des
 * PM2,5 à peine au-dessus de leur limite.
 */
function polluantASignaler(annual: AnnualPollutantStatDto[], m: AnalysisMessages): string | null {
  const byEcart = annual
    .map((s) => ({ s, ecart: ecartPct(s.value, s.nationalMean) ?? 0 }))
    .sort((a, b) => b.ecart - a.ecart);
  const overLimit = byEcart.find((x) => x.s.value > EU_LIMITS[x.s.code]);
  if (overLimit) return m.air.insightPollutants[overLimit.s.code];
  const aboveFrance = byEcart.find((x) => x.ecart >= AIR_PROCHE_PCT);
  return aboveFrance ? m.air.insightPollutants[aboveFrance.s.code] : null;
}

function buildAir(airQuality: AirQualityAnalysisDto | null | undefined, m: AnalysisMessages): AirInsightInput | undefined {
  // Garde d'AirQualityCard, drapeau compris.
  if (!FEATURES.showAirQuality || !airQuality?.available || airQuality.annual.length === 0) return undefined;

  const { annual } = airQuality;
  const position = (code: string) => {
    const s = annual.find((a) => a.code === code);
    return s ? positionAir(ecartPct(s.value, s.nationalMean)) : null;
  };
  const ozone = position("o3");
  const no2 = position("no2");

  const fallback = annual.filter((s) => s.ruralFallback);
  return {
    ...(fallback.length > 0
      ? { provenance_mesures: m.air.insightRuralSource(Math.round(Math.max(...fallback.map((s) => s.distanceKm)))) }
      : {}),
    polluants: annual.map((s) => airPolluant(s, m)),
    polluant_a_signaler: polluantASignaler(annual, m),
    ozone_plus_eleve_hors_villes:
      (ozone === "au-dessus" || ozone === "nettement au-dessus") &&
      no2 !== null &&
      no2 !== "au-dessus" &&
      no2 !== "nettement au-dessus",
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

/**
 * `lang` : langue dans laquelle le modèle rédigera. Les noms de champs restent français —
 * c'est le protocole du prompt — mais les libellés que le modèle recopie (noms de mois,
 * étiquettes politiques, unités) sont donnés dans la langue de sortie.
 */
export function buildCardInsightsInput(
  data: LocationAnalysisDto,
  codeInsee?: string,
  lang: Locale = "fr",
): CardInsightsInput {
  const m = getAnalysisMessages(lang);
  return {
    mode: data.mode,
    perimetre: buildPerimetre(data),
    fiscalite: buildFiscalite(data.localTax),
    securite: buildSecurite(data.security, codeInsee, m),
    demographie: buildDemographie(data.demographics, data.mode),
    logement: buildLogement(data.demographics, data.mode, m),
    emploi: buildEmploi(data.demographics, data.mode, m),
    menages: buildMenages(data.demographics, data.mode, m),
    elections: buildElections(data.elections, m),
    municipales: buildMunicipales(data.municipales, m),
    climat: buildClimat(data.climate, m),
    air: buildAir(data.airQuality, m),
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
