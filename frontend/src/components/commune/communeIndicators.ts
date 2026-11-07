/**
 * Les indicateurs comparables d'un arrondissement, lus dans ses `CommuneStats`.
 *
 * Le catalogue du comparatif des arrondissements (`CityComparisonPage`) et des phrases de rang
 * de chaque page (`cityComparison.ts`) : une seule lecture de chaque chiffre, donc un seul
 * classement. La future comparaison d'adresses aura le sien, lu dans `LocationAnalysisDto`,
 * avec les mêmes identifiants (`lib/comparison/types.ts`).
 *
 * Toutes les parts sont rendues en pourcentages de 0 à 100 : l'INSEE les livre ainsi pour le
 * logement et l'emploi, mais en fractions pour les âges, la pauvreté et la participation.
 */

import { FEATURES } from "@/lib/site-features";
import type {
  IndicateurComparable,
  IndicateurComparableId,
} from "@/lib/comparison/types";
import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { hasRentContent, rentOf } from "@/components/analysis/rentsModel";

type Ind = IndicateurComparable<CommuneStats>;

const fini = (v: number | null | undefined): number | null =>
  v !== null && v !== undefined && Number.isFinite(v) ? v : null;

/** Un prix, un revenu ou une population à zéro est une absence de donnée, pas une valeur. */
const positif = (v: number | null | undefined): number | null => {
  const x = fini(v);
  return x !== null && x > 0 ? x : null;
};

const enPct = (fraction: number | null | undefined): number | null => {
  const x = fini(fraction);
  return x === null ? null : x * 100;
};

/** Dernière année de la série de délinquance, pour l'arrondissement, sa ville et la France. */
function securite(indicateur: string) {
  const local = (s: CommuneStats) =>
    s.securite?.local.indicateurs.find((i) => i.indicateur === indicateur) ?? null;
  const dernier = (s: CommuneStats) => (s.securite?.local.annees.length ?? 0) - 1;
  return {
    value: (s: CommuneStats) => fini(local(s)?.commune[dernier(s)]),
    /** Le nombre de faits de la même année, `null` si le taux est masqué. */
    faits: (s: CommuneStats) => fini(local(s)?.faits[dernier(s)]),
    // Le SSMSI tait les effectifs de 1 à 4 : le taux manque, mais la borne basse est connue.
    masque: (s: CommuneStats) => {
      const ind = local(s);
      const i = dernier(s);
      return ind !== null && ind.commune[i] == null && ind.borneBasse[i] != null;
    },
    references: {
      ville: (s: CommuneStats) =>
        fini(
          s.securite?.ville?.indicateurs.find((i) => i.indicateur === indicateur)?.commune[
            (s.securite?.ville?.annees.length ?? 0) - 1
          ],
        ),
      france: (s: CommuneStats) => fini(local(s)?.france[dernier(s)]),
    },
  };
}

/** Le taux, son masque et ses repères. */
function taux(indicateur: string) {
  const { value, masque, references } = securite(indicateur);
  return { value, masque, references };
}

/**
 * Le nombre de faits derrière le taux : un taux pour 1 000 habitants gonfle là où l'on vient
 * sans habiter, le nombre remet chaque arrondissement à sa place. Repère : la ville entière.
 */
function faits(indicateur: string) {
  const { faits: value, masque } = securite(indicateur);
  return {
    value,
    masque,
    references: {
      ville: (s: CommuneStats) => {
        const ville = s.securite?.ville;
        const ind = ville?.indicateurs.find((i) => i.indicateur === indicateur);
        return fini(ind?.faits[(ville?.annees.length ?? 0) - 1]);
      },
    },
  };
}

/** Le libellé SSMSI de chaque taux de délinquance du catalogue. */
const SECURITE_SOURCES: Partial<Record<IndicateurComparableId, string>> = {
  cambriolages: "Cambriolages de logement",
  violencesPhysiques: "Violences physiques hors cadre familial",
  volsDansVehicules: "Vols dans les véhicules",
};

/** Le dénominateur publié du taux (habitants ou logements), dernière année ; `null` hors délinquance. */
export function denominateurSecurite(s: CommuneStats, id: IndicateurComparableId): number | null {
  const indicateur = SECURITE_SOURCES[id];
  if (!indicateur || !s.securite) return null;
  const ind = s.securite.local.indicateurs.find((i) => i.indicateur === indicateur);
  return fini(ind?.denominateur[s.securite.local.annees.length - 1]);
}

export const COMMUNE_INDICATEURS: Record<IndicateurComparableId, Ind> = {
  prixAppartement: {
    id: "prixAppartement",
    section: "immobilier",
    unite: "eurM2",
    decimales: 0,
    value: (s) => positif(s.prix.prixM2Median),
    references: { ville: (s) => positif(s.prixBenchmarkVille.prixM2Median) },
  },
  ventesAppartement: {
    id: "ventesAppartement",
    section: "immobilier",
    unite: "ventes",
    decimales: 0,
    value: (s) => positif(s.prix.nbTransactions),
  },
  loyerAppartement: {
    id: "loyerAppartement",
    section: "immobilier",
    unite: "eurM2Mois",
    decimales: 1,
    value: (s) =>
      FEATURES.showRents && hasRentContent(s.loyers) ? positif(rentOf(s.loyers, "app")?.loyerM2) : null,
    references: { ville: (s) => (FEATURES.showRents ? positif(s.loyersVille?.app) : null) },
  },
  population: {
    id: "population",
    section: "population",
    unite: "habitants",
    decimales: 0,
    value: (s) => positif(s.demo.populationTotale),
  },
  revenuMedian: {
    id: "revenuMedian",
    section: "population",
    unite: "eurAn",
    decimales: 0,
    value: (s) => positif(s.demo.revenuMedianPondere),
    references: { france: (s) => positif(s.demoFrance?.revenuMedianPondere) },
  },
  tauxPauvrete: {
    id: "tauxPauvrete",
    section: "population",
    unite: "pct",
    // Filosofi publie ce taux en points entiers : une décimale inventerait une précision.
    decimales: 0,
    value: (s) => enPct(s.demo.tauxPauvretePondere),
    references: { france: (s) => enPct(s.demoFrance?.tauxPauvretePondere) },
  },
  part0_14: {
    id: "part0_14",
    section: "population",
    unite: "pct",
    decimales: 1,
    value: (s) => (s.demo.populationTotale > 0 ? enPct(s.demo.partAges.part_0_14) : null),
    references: { france: (s) => (s.demoFrance ? enPct(s.demoFrance.partAges.part_0_14) : null) },
  },
  part75Plus: {
    id: "part75Plus",
    section: "population",
    unite: "pct",
    decimales: 1,
    value: (s) => (s.demo.populationTotale > 0 ? enPct(s.demo.partAges.part_75_plus) : null),
    references: { france: (s) => (s.demoFrance ? enPct(s.demoFrance.partAges.part_75_plus) : null) },
  },
  couplesAvecEnfants: {
    id: "couplesAvecEnfants",
    section: "population",
    unite: "pct",
    decimales: 1,
    value: (s) => (FEATURES.showHouseholds ? fini(s.households?.commune?.pctCouplesAvecEnfants) : null),
    references: {
      france: (s) => (FEATURES.showHouseholds ? fini(s.households?.france?.pctCouplesAvecEnfants) : null),
    },
  },
  proprietaires: {
    id: "proprietaires",
    section: "population",
    unite: "pct",
    decimales: 1,
    value: (s) => positif(s.housing?.commune?.pctProprietaires),
    references: { france: (s) => fini(s.housing?.france?.pctProprietaires) },
  },
  hlm: {
    id: "hlm",
    section: "population",
    unite: "pct",
    decimales: 1,
    value: (s) => fini(s.housing?.commune?.pctHlm),
    references: { france: (s) => fini(s.housing?.france?.pctHlm) },
  },
  residencesSecondaires: {
    id: "residencesSecondaires",
    section: "population",
    unite: "pct",
    decimales: 1,
    value: (s) => fini(s.housing?.commune?.pctResidencesSecondaires),
    references: { france: (s) => fini(s.housing?.france?.pctResidencesSecondaires) },
  },
  logementsVacants: {
    id: "logementsVacants",
    section: "population",
    unite: "pct",
    decimales: 1,
    value: (s) => fini(s.housing?.commune?.pctVacants),
    references: { france: (s) => fini(s.housing?.france?.pctVacants) },
  },
  chomage: {
    id: "chomage",
    section: "population",
    unite: "pct",
    decimales: 1,
    value: (s) => positif(s.employment?.commune?.tauxChomage),
    references: { france: (s) => fini(s.employment?.france?.tauxChomage) },
  },
  diplomesSuperieur: {
    id: "diplomesSuperieur",
    section: "population",
    unite: "pct",
    decimales: 1,
    value: (s) => fini(s.employment?.commune?.pctDiplomesSuperieur),
    references: { france: (s) => fini(s.employment?.france?.pctDiplomesSuperieur) },
  },
  cambriolages: {
    id: "cambriolages",
    section: "securite",
    unite: "pour1000Logements",
    decimales: 1,
    ...taux("Cambriolages de logement"),
  },
  violencesPhysiques: {
    id: "violencesPhysiques",
    section: "securite",
    unite: "pour1000Habitants",
    decimales: 1,
    ...taux("Violences physiques hors cadre familial"),
  },
  volsDansVehicules: {
    id: "volsDansVehicules",
    section: "securite",
    unite: "pour1000Habitants",
    decimales: 1,
    ...taux("Vols dans les véhicules"),
  },
  cambriolagesFaits: {
    id: "cambriolagesFaits",
    section: "securite",
    unite: "faits",
    decimales: 0,
    ...faits("Cambriolages de logement"),
  },
  violencesPhysiquesFaits: {
    id: "violencesPhysiquesFaits",
    section: "securite",
    unite: "faits",
    decimales: 0,
    ...faits("Violences physiques hors cadre familial"),
  },
  volsDansVehiculesFaits: {
    id: "volsDansVehiculesFaits",
    section: "securite",
    unite: "faits",
    decimales: 0,
    ...faits("Vols dans les véhicules"),
  },
  participationPresidentielle: {
    id: "participationPresidentielle",
    section: "elections",
    unite: "pct",
    decimales: 1,
    value: (s) => (s.elections && s.elections.inscrits > 0 ? enPct(s.elections.tauxParticipation) : null),
    references: { france: (s) => enPct(s.elections?.tauxParticipationFrance) },
  },
};
