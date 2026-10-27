/**
 * Loyers d'annonce par commune — « Carte des loyers » (ANIL, ministère du Logement).
 *
 * Loyers au m², charges comprises, pour un logement non meublé, estimés sur les annonces du
 * 3e trimestre. Une édition par an, non comparable à la précédente : aucune série dans le temps.
 */

export type RentType = "app" | "app12" | "app3" | "maison";

/** L'ordre d'affichage : appartements (tous, petits, grands), puis maisons. */
export const RENT_TYPES: RentType[] = ["app", "app12", "app3", "maison"];

/**
 * `commune` : estimé sur les annonces de la commune. `maille` : sur un groupe de communes
 * voisines, faute d'annonces suffisantes. `epci` : sur l'intercommunalité.
 */
export type RentLevel = "commune" | "maille" | "epci";

export interface RentIndicator {
  type: RentType;
  /** €/m², charges comprises. */
  loyerM2: number;
  /** Intervalle de prédiction à 95 %. */
  icBas: number | null;
  icHaut: number | null;
  niveau: RentLevel;
  nbAnnonces: number;
  /** Au sens du producteur : au moins 30 annonces et un R² ajusté d'au moins 0,5. */
  fiable: boolean;
}

/** Une commune de la carte « alentour », loyer des appartements tous types. */
export interface RentAreaFeature {
  type: "Feature";
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
  properties: {
    code: string;
    nom: string;
    loyerM2: number;
    niveau: RentLevel;
    /** La commune de l'analyse, tracée d'un contour plus épais. */
    courante: boolean;
  };
}

/**
 * Zonage « zone tendue » de la commune (décret n° 2013-392, dernière mise à jour). `tendue` :
 * règles de location et fiscalité ; `touristique` (« zone touristique et tendue ») : la
 * fiscalité seulement ; `non` : hors zonage.
 */
export type RentZoning = "tendue" | "touristique" | "non";

export interface RentZoneTendue {
  zonage: RentZoning;
  /** Date du décret de classement, ISO. */
  decret: string;
}

export interface RentAnalysis {
  codeCommune: string;
  nomCommune: string | null;
  annee: number;
  indicateurs: RentIndicator[];
  alentour: RentAreaFeature[];
  /** `null` si la commune manque au fichier du zonage. */
  zoneTendue: RentZoneTendue | null;
}
