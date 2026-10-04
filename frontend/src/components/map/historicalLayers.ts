import { ignRasterSource } from "./basemaps";
import type { RasterSourceSpecification } from "maplibre-gl";

/**
 * Les époques disponibles sur la Géoplateforme IGN (`data.geopf.fr`, qui est
 * cartes.gouv.fr) — sans clé API ni quota.
 *
 * `layer`, `style`, `format` et `maxzoom` viennent du GetCapabilities et **ne sont pas
 * devinables** : chaque couche a les siens, et une erreur renvoie un 400 avec une
 * exception XML plutôt qu'une tuile vide. `ORTHOIMAGERY.ORTHOPHOTOS.1965-1980` en est
 * l'exemple : elle n'expose que le style `BDORTHOHISTORIQUE` et rejette `normal`.
 *
 * L'ortho-photographie actuelle ne figure pas ici : c'est le **fond**
 * (`IGN_ORTHO_RASTER_STYLE`), sur lequel les époques se fondent. « Aujourd'hui » n'est
 * donc pas une septième couche mais l'absence de couche — c'est ce que représente
 * `eraId === null` côté composants.
 *
 * `ORTHOIMAGERY.ORTHOPHOTOS.1980-1995` existe mais n'est pas proposée : sa couverture
 * est trop lacunaire (404 sur quatre des cinq points de contrôle, dont Paris, Lyon et
 * Marseille). Une pastille qui n'affiche rien une fois sur deux vaut moins que pas de
 * pastille.
 */
export type EraId =
  | "cassini"
  | "etat-major"
  | "scan50-1950"
  | "ortho-1950-1965"
  | "ortho-1965-1980"
  | "ortho-2000-2005";

export interface HistoricalEra {
  id: EraId;
  /** Les textes de l'époque (pastille, nom, période, contexte) sont dans les messages. */
  layer: string;
  style?: string;
  format: string;
  maxzoom: number;
  minzoom?: number;
  /** Surcharge la mention IGN quand la couche est co-produite. */
  attribution?: string;
}

export const HISTORICAL_ERAS: readonly HistoricalEra[] = [
  {
    id: "cassini",
    layer: "BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI",
    format: "image/png",
    maxzoom: 14,
    minzoom: 6,
    // Co-production BnF : la mention IGN seule serait incomplète. La chaîne courte étant
    // une sous-chaîne de celle-ci, MapLibre affiche automatiquement la version longue
    // quand Cassini est visible, et revient à la courte quand on la masque.
    attribution:
      '&copy; <a href="https://www.ign.fr/">IGN-F/Géoportail</a> &middot; BnF',
  },
  {
    id: "etat-major",
    layer: "GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40",
    format: "image/jpeg",
    maxzoom: 15,
    minzoom: 6,
  },
  {
    id: "scan50-1950",
    layer: "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950",
    format: "image/jpeg",
    maxzoom: 15,
    minzoom: 3,
  },
  {
    id: "ortho-1950-1965",
    layer: "ORTHOIMAGERY.ORTHOPHOTOS.1950-1965",
    format: "image/png",
    maxzoom: 18,
  },
  {
    id: "ortho-1965-1980",
    layer: "ORTHOIMAGERY.ORTHOPHOTOS.1965-1980",
    // Cette couche n'expose PAS le style `normal` : le passer renvoie un HTTP 400.
    style: "BDORTHOHISTORIQUE",
    format: "image/png",
    maxzoom: 18,
  },
  {
    id: "ortho-2000-2005",
    layer: "ORTHOIMAGERY.ORTHOPHOTOS2000-2005",
    format: "image/jpeg",
    maxzoom: 18,
  },
];

export const HISTORICAL_ERAS_BY_ID: ReadonlyMap<string, HistoricalEra> = new Map(
  HISTORICAL_ERAS.map((era) => [era.id, era]),
);

/** Préfixe des sources et calques posés par le hook — hors de l'espace de noms des
 *  calques du style, et de celui que balaie `applyLayerVisibility`. */
export const HISTORY_PREFIX = "history-";

export function historicalSourceId(eraId: string): string {
  return `${HISTORY_PREFIX}${eraId}`;
}

export function historicalRasterSource(era: HistoricalEra): RasterSourceSpecification {
  return ignRasterSource(era.layer, {
    format: era.format,
    style: era.style,
    maxzoom: era.maxzoom,
    minzoom: era.minzoom,
    attribution: era.attribution,
  });
}
