import type { DvfBuildingDto, PropertyKindDto, PropertyKindMarketDto, RealEstateAnalysisDto } from "@/types/location-analysis";

/**
 * Section et numéro d'un identifiant cadastral : « 75115000EL0044 » → section « EL »,
 * numéro 44. Les sections d'une lettre s'écrivent « 0A » dans l'identifiant.
 */
export function parcelParts(parcelId: string | null): { section: string; number: number } | null {
  if (!parcelId || parcelId.length !== 14) return null;
  const section = parcelId.slice(8, 10).replace(/^0/, "");
  const number = Number(parcelId.slice(10));
  return section && Number.isFinite(number) ? { section, number } : null;
}

/**
 * L'immeuble est-il celui de l'adresse analysée ? Même section et même numéro que la
 * parcelle du cadastre, et à moins de 50 m : section et numéro se répètent d'une commune à
 * l'autre, et le rayon d'1 km en franchit parfois la limite.
 */
export function isAddressParcel(
  building: DvfBuildingDto,
  addressParcel: { section: string; numero: string } | null | undefined,
): boolean {
  const parts = parcelParts(building.parcelId);
  if (!parts || !addressParcel || building.distanceMeters > 50) return false;
  return parts.section === addressParcel.section.replace(/^0/, "") && parts.number === Number(addressParcel.numero);
}

/** Première et dernière année des ventes d'un immeuble. */
export function salesYears(building: DvfBuildingDto): { from: number; to: number } {
  const years = building.sales.map((s) => Number(s.date.slice(0, 4)));
  return { from: Math.min(...years), to: Math.max(...years) };
}

/** Ventes affichées d'emblée : une douzaine donne déjà un bon aperçu du voisinage. */
export const SALES_VISIBLE = 12;

/**
 * Nombre d'immeubles affichés d'emblée : les plus proches, jusqu'à atteindre `SALES_VISIBLE`
 * ventes (l'immeuble qui franchit le seuil est montré en entier). Les autres passent sous
 * « Voir les autres immeubles ».
 */
export function visibleBuildingCount(buildings: DvfBuildingDto[]): number {
  let sales = 0;
  for (let i = 0; i < buildings.length; i++) {
    sales += buildings[i].sales.length;
    if (sales >= SALES_VISIBLE) return i + 1;
  }
  return buildings.length;
}

/** Ordre d'affichage des types de bien. */
export const PROPERTY_KINDS: readonly PropertyKindDto[] = ["appartement", "maison"];

/**
 * Surface de l'exemple chiffré sous chaque médiane, pour traduire un prix au m² en ordre de
 * grandeur d'un achat : un deux-pièces courant, une maison familiale.
 */
export const EXAMPLE_SURFACES: Record<PropertyKindDto, number> = { appartement: 50, maison: 100 };

/** Prix de l'exemple, arrondi au millier. */
export function examplePrice(kind: PropertyKindDto, pricePerSqm: number): number {
  return Math.round((pricePerSqm * EXAMPLE_SURFACES[kind]) / 1000) * 1000;
}

/** Les types qui ont au moins une vente, dans l'ordre d'affichage. */
export function marketsShown(realEstate: RealEstateAnalysisDto): Array<{ kind: PropertyKindDto; market: PropertyKindMarketDto }> {
  return PROPERTY_KINDS.flatMap((kind) => {
    const market = realEstate.markets?.[kind];
    return market ? [{ kind, market }] : [];
  });
}
