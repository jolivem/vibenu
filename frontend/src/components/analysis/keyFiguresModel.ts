import type { KeyFiguresMessages } from "@/i18n/messages/fr/analysis/keyFigures";
import type { LocationAnalysisDto, SecurityRating } from "@/types/location-analysis";
import { FEATURES } from "@/lib/site-features";
import type { KeyFigure } from "./KeyFigures";
import { hasRentContent, rentOf } from "./rentsModel";
import type { SectionId } from "./sections";

/**
 * Les chiffres clés d'une analyse, une tuile par section — deux pour l'immobilier, prix de
 * vente puis loyer — partagés par le bandeau de l'écran et l'en-tête de la fiche PDF.
 *
 * Le bandeau ne reprend pas tout le sommaire : « Environnement » (qualité de l'air),
 * « Risques » et « Population » en sont volontairement absents. Une section sans chiffre
 * disponible n'a pas de tuile non plus — il ne reste pas de trou.
 */
export function buildKeyFigures(
  data: LocationAnalysisDto,
  securityRating: SecurityRating | undefined,
  activeSections: readonly SectionId[],
  m: KeyFiguresMessages,
): KeyFigure<SectionId>[] {
  const figures: Partial<Record<SectionId, KeyFigure<SectionId>[]>> = {};
  const add = (figure: KeyFigure<SectionId>) => {
    (figures[figure.section] ??= []).push(figure);
  };

  // Un prix nul n'est pas un prix : c'est l'absence de ventes connues. La tuile
  // « 0 €/m² » se lisait comme une donnée.
  const medianPrice = data.realEstate?.medianPricePerSquareMeter;
  if (medianPrice != null && medianPrice > 0) {
    add({ section: "immobilier", label: m.priceLabel, value: m.price(medianPrice) });
  }

  // Le loyer des appartements tous types, à côté du prix de vente : les deux chiffres qu'on
  // compare d'une adresse à l'autre, selon qu'on achète ou qu'on loue.
  const rent = FEATURES.showRents && hasRentContent(data.rents) ? rentOf(data.rents, "app") : null;
  if (rent) {
    add({ section: "immobilier", label: m.rentLabel, value: m.rent(rent.loyerM2) });
  }

  add({
    section: "deplacer",
    label: m.transportLabel,
    value: m.transportLevels[data.mobility.label],
  });

  // Sur les comptages dédoublonnés et non sur la liste : plafonnée à 50, celle-ci
  // affichait « 50 services » dans tout centre-ville. Les restaurants n'entrent pas dans le
  // total — 143 à 500 m d'une adresse du 15e, ils noieraient les services du quotidien.
  // Sans comptage, pas de tuile plutôt qu'un nombre faux.
  const counts = data.neighborhood.counts;
  if (data.mode !== "commune" && counts) {
    const total = Object.entries(counts.byCategory)
      .filter(([category]) => category !== "restaurant")
      .reduce((sum, [, count]) => sum + (count ?? 0), 0);
    add({
      section: "proximite",
      label: m.nearbyLabel(counts.radiusMeters),
      value: m.nearbyValue(total),
    });
  }

  // Seule tuile dont la valeur vient du modèle et non du DTO : elle s'insère donc
  // dans la rangée au second aller-retour, quand la note arrive.
  if (securityRating) {
    add({
      section: "securite",
      label: m.securityLabel,
      value: m.securityRatings[securityRating],
    });
  }

  return activeSections.flatMap((id) => figures[id] ?? []);
}
