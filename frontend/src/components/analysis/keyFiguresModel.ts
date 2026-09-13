import { SECURITY_RATING_LABELS, type LocationAnalysisDto, type SecurityRating } from "@/types/location-analysis";
import { formatFr } from "@/lib/format";
import type { KeyFigure } from "./KeyFigures";
import type { SectionId } from "./sections";

/** Rayon retenu pour « à moins de 10 min à pied », à 75 m/min — la vitesse de marche
 *  déjà utilisée pour afficher les temps de trajet des POI. */
const TEN_MINUTES_WALK_METERS = 750;

/** Les niveaux du DTO sont en minuscules (« très bon », « modéré ») : ils se lisent au fil
 *  d'une phrase dans les cards, mais isolés dans une tuile ils veulent une capitale. */
function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Les chiffres clés d'une analyse, une tuile par section — partagés par le bandeau de
 * l'écran et l'en-tête de la fiche PDF.
 *
 * Le bandeau ne reprend pas tout le sommaire : « Environnement » (qualité de l'air),
 * « Risques » et « Population » en sont volontairement absents. Une section sans chiffre
 * disponible n'a pas de tuile non plus — il ne reste pas de trou.
 */
export function buildKeyFigures(
  data: LocationAnalysisDto,
  securityRating: SecurityRating | undefined,
  activeSections: readonly SectionId[],
): KeyFigure[] {
  const figures: Partial<Record<SectionId, KeyFigure>> = {};

  // Un prix nul n'est pas un prix : c'est l'absence de ventes connues. La tuile
  // « 0 €/m² » se lisait comme une donnée.
  const medianPrice = data.realEstate?.medianPricePerSquareMeter;
  if (medianPrice != null && medianPrice > 0) {
    figures.immobilier = {
      section: "immobilier",
      label: "Prix médian",
      value: `${formatFr(Math.round(medianPrice))} €/m²`,
    };
  }

  figures.deplacer = {
    section: "deplacer",
    label: "Transports",
    value: capitalizeFirst(data.mobility.label),
  };

  if (data.mode !== "commune") {
    const nearby = data.neighborhood.pois.filter(
      (poi) => poi.distanceMeters <= TEN_MINUTES_WALK_METERS,
    ).length;
    figures.proximite = {
      section: "proximite",
      label: "À moins de 10 min",
      value: `${nearby} service${nearby > 1 ? "s" : ""}`,
    };
  }

  // Seule tuile dont la valeur vient du modèle et non du DTO : elle s'insère donc
  // dans la rangée au second aller-retour, quand la note arrive.
  if (securityRating) {
    figures.securite = {
      section: "securite",
      label: "Sécurité",
      value: SECURITY_RATING_LABELS[securityRating],
    };
  }

  return activeSections
    .map((id) => figures[id])
    .filter((figure): figure is KeyFigure => figure !== undefined);
}
