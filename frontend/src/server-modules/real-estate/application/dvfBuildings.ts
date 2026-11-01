import type { DvfBuilding, DvfSale, DvfTransactionFeature } from "../domain/real-estate.types";

/** Une vente lue en base, avec ce qu'il faut pour la placer. */
export interface LocatedSale extends DvfSale {
  saleId: string;
  parcelId: string | null;
  distanceMeters: number;
  geometry: DvfTransactionFeature["geometry"];
  /** Prix au m² non arrondi, pour les médianes. */
  exactPricePerSqm: number;
}

/** Médiane telle que la card la calcule : l'élément central, sans interpolation. */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Regroupe les ventes par parcelle. À Paris, une parcelle est le plus souvent un immeuble de
 * plusieurs dizaines d'appartements : neuf ventes en cinq ans sur la même n'ont rien
 * d'anormal. Sans ce regroupement, la carte superposait autant de contours que de ventes,
 * et la bulle n'en montrait qu'une, au hasard de l'ordre d'affichage.
 *
 * Les immeubles gardent l'ordre de leur première vente (la plus proche en mode adresse).
 */
export function groupByParcel(sales: LocatedSale[]): {
  buildings: DvfBuilding[];
  features: DvfTransactionFeature[];
} {
  const groups = new Map<string, LocatedSale[]>();
  for (const sale of sales) {
    // Sans parcelle, la vente reste seule : on ne la rattache à rien.
    const key = sale.parcelId ?? `vente:${sale.saleId}`;
    const list = groups.get(key);
    if (list) list.push(sale);
    else groups.set(key, [sale]);
  }

  const buildings: DvfBuilding[] = [];
  const features: DvfTransactionFeature[] = [];
  for (const [key, list] of groups) {
    const medianPricePerSqm = Math.round(median(list.map((s) => s.pricePerSqm)));
    const ordered = [...list].sort((a, b) => b.date.localeCompare(a.date));
    buildings.push({
      key,
      parcelId: list[0].parcelId,
      distanceMeters: Math.round(Math.min(...list.map((s) => s.distanceMeters))),
      medianPricePerSqm,
      sales: ordered.map(({ date, propertyType, surface, price, pricePerSqm, dwellings }) => ({
        date, propertyType, surface, price, pricePerSqm, dwellings,
      })),
      building: null,
    });
    features.push({
      type: "Feature",
      geometry: list[0].geometry,
      properties: { buildingKey: key, pricePerSqm: medianPricePerSqm, salesCount: list.length },
    });
  }
  return { buildings, features };
}
