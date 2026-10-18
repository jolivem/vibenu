/**
 * Les chiffres clés d'un arrondissement, une tuile par section — deux pour « Achat &
 * location » : le prix de vente, puis le loyer.
 *
 * Décalque de `analysis/keyFiguresModel.ts`, avec la même discipline : une section sans
 * chiffre disponible n'a pas de tuile — il ne reste pas de trou, le bandeau se resserre.
 * La sécurité n'en a pas : aucun scalaire ne résume honnêtement la rubrique (la tuile de
 * l'analyse vient d'une note LLM que la page commune n'a pas).
 */

import type { KeyFigure } from "@/components/analysis/KeyFigures";
import { hasRentContent, rentOf } from "@/components/analysis/rentsModel";
import { keyFigures as keyFiguresMessages } from "@/i18n/messages/fr/analysis/keyFigures";
import { FEATURES } from "@/lib/site-features";
import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { equipementsAffichables, formatEur, formatInt, formatPct } from "./format";
import type { CommuneSectionId } from "./sections";

export function buildCommuneKeyFigures(
  stats: CommuneStats,
  activeSections: readonly CommuneSectionId[],
): KeyFigure<CommuneSectionId>[] {
  const figures: Partial<Record<CommuneSectionId, KeyFigure<CommuneSectionId>[]>> = {};
  const add = (figure: KeyFigure<CommuneSectionId>) => {
    (figures[figure.section] ??= []).push(figure);
  };

  // Même doctrine que l'analyse : « 0 €/m² » se lit comme une donnée alors que c'est
  // l'absence de ventes connues.
  const prix = stats.prix.prixM2Median;
  if (prix !== null && prix > 0) {
    add({ section: "prix-immobilier", label: "Prix médian", value: `${formatEur(prix)}/m²` });
  }

  // Même tuile que l'analyse, mêmes libellés : le loyer des appartements tous types.
  const loyer = FEATURES.showRents && hasRentContent(stats.loyers) ? rentOf(stats.loyers, "app") : null;
  if (loyer) {
    add({
      section: "prix-immobilier",
      label: keyFiguresMessages.rentLabel,
      value: keyFiguresMessages.rent(loyer.loyerM2),
    });
  }

  const totalEquipements = equipementsAffichables(stats).reduce((sum, e) => sum + e.nb, 0);
  if (totalEquipements > 0) {
    add({ section: "equipements", label: "Équipements", value: formatInt(totalEquipements) });
  }

  if (stats.demo.populationTotale > 0) {
    add({ section: "demographie", label: "Population", value: formatInt(stats.demo.populationTotale) });
  }

  if (stats.elections) {
    add({ section: "elections", label: "Participation", value: formatPct(stats.elections.tauxParticipation, 1) });
  }

  // Les deux catégories hautes de l'indice ATMO sur l'année la plus récente : c'est le
  // chiffre que la card met elle-même en avant.
  const derniereAnnee = stats.airQuality?.historique[0];
  if (derniereAnnee) {
    add({
      section: "qualite-air",
      label: "Jours bons ou moyens",
      value: `${formatInt(derniereAnnee.joursBonne + derniereAnnee.joursMoyenne)} j`,
    });
  }

  return activeSections.flatMap((id) => figures[id] ?? []);
}
