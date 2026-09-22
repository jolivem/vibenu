/**
 * Les questions fréquentes d'une page hub de ville.
 *
 * Même discipline que `buildFaqItems` côté arrondissement : toute question dont la
 * réponse n'est pas chiffrable est exclue, et la liste sert à la fois de contenu rendu et
 * de source du balisage `FAQPage` — les deux ne peuvent donc pas diverger.
 */

import type { CityDef } from "@/lib/commune-slugs";
import type { ClimateAnalysis } from "@/server-modules/climate/domain/climate.types";
import type { MunicipalesAnalysis } from "@/server-modules/elections/domain/municipales.types";
import type { RiskAnalysis } from "@/server-modules/risks/domain/risk.types";
import type { FaqItem } from "./CommuneFaqSection";
import { formatEur, formatInt } from "./format";

export interface HubFaqInput {
  cityDef: CityDef;
  arrondissements: Array<{ nomCourt: string; prixM2Median: number | null; populationTotale: number }>;
  municipales: MunicipalesAnalysis | null;
  climate: ClimateAnalysis | null;
  risks: RiskAnalysis | null;
}

export function buildHubFaqItems({
  cityDef,
  arrondissements,
  municipales,
  climate,
  risks,
}: HubFaqInput): FaqItem[] {
  const items: FaqItem[] = [];
  const ville = cityDef.nomAffiche;

  // Les deux questions les plus cherchées se répondent depuis l'annuaire déjà chargé,
  // sans une requête de plus.
  const avecPrix = arrondissements.filter((a) => a.prixM2Median !== null && a.prixM2Median > 0);
  if (avecPrix.length >= 2) {
    const cher = avecPrix.reduce((a, b) => (b.prixM2Median! > a.prixM2Median! ? b : a));
    const abordable = avecPrix.reduce((a, b) => (b.prixM2Median! < a.prixM2Median! ? b : a));
    items.push({
      question: `Quel est l'arrondissement le plus cher de ${ville} ?`,
      answer: `Le prix médian au mètre carré le plus élevé de ${ville} est celui de ${cher.nomCourt}, à ${formatEur(cher.prixM2Median)}. Le plus abordable est ${abordable.nomCourt}, à ${formatEur(abordable.prixM2Median)} (données DVF, 24 derniers mois).`,
    });
  }

  const peuple = arrondissements.filter((a) => a.populationTotale > 0);
  if (peuple.length >= 2) {
    const grand = peuple.reduce((a, b) => (b.populationTotale > a.populationTotale ? b : a));
    items.push({
      question: `Quel est l'arrondissement le plus peuplé de ${ville} ?`,
      answer: `${grand.nomCourt} est le plus peuplé des ${cityDef.nbArrondissements} arrondissements de ${ville}, avec ${formatInt(grand.populationTotale)} habitants (INSEE, données IRIS agrégées).`,
    });
  }

  if (municipales && municipales.listes.length > 0) {
    const tete = [...municipales.listes].sort((a, b) => b.pctExprimes - a.pctExprimes)[0];
    const nom = tete.teteDeListe ?? tete.libelle;
    items.push({
      question: `Qui a gagné les municipales 2026 à ${ville} ?`,
      answer: `Au ${municipales.tour === 1 ? "1er" : "2e"} tour des municipales de mars 2026 à ${ville}, la liste conduite par ${nom} est arrivée en tête avec ${tete.pctExprimes.toFixed(1).replace(".", ",")} % des suffrages exprimés, pour une participation de ${municipales.participationPct.toFixed(1).replace(".", ",")} %.`,
    });
  }

  if (climate?.temperatureC !== null && climate?.temperatureC !== undefined) {
    const pluie =
      climate.precipitationMm !== null
        ? ` Il y tombe en moyenne ${formatInt(climate.precipitationMm)} mm de pluie par an.`
        : "";
    items.push({
      question: `Quelle est la température moyenne à ${ville} ?`,
      answer: `La température moyenne annuelle à ${ville} est de ${climate.temperatureC.toFixed(1).replace(".", ",")} °C, sur les normales Météo-France 1991-2020.${pluie}`,
    });
  }

  const nommes = risks?.categories.filter((c) => c.level !== "inconnu") ?? [];
  if (nommes.length > 0) {
    items.push({
      question: `Quels risques naturels concernent ${ville} ?`,
      answer: `Géorisques recense à ${ville} : ${nommes.map((c) => c.name.toLowerCase()).join(", ")}. Ces statuts valent pour la commune entière ; l'intensité à une adresse précise peut différer.`,
    });
  }

  return items;
}
