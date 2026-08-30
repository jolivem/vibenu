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
export interface HistoricalEra {
  id: string;
  /** La pastille de la frise — une date, assez courte pour tenir. */
  shortLabel: string;
  /** Le nom du document. */
  label: string;
  /** La période couverte, en toutes lettres. */
  period: string;
  /** Une phrase de contexte : la valeur éditoriale de la card, et le texte indexable. */
  context: string;
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
    shortLabel: "~1750",
    label: "Carte de Cassini",
    period: "vers 1750",
    context:
      "Le premier levé géométrique de tout le royaume, dressé par quatre générations de Cassini. Elle montre les villages, les chemins et les moulins d'avant la Révolution — mais pas les parcelles : à cette échelle, seul le bâti groupé est représenté.",
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
    shortLabel: "1820-66",
    label: "Carte de l'état-major",
    period: "1820-1866",
    context:
      "Levée au 1/40 000 par les officiers du Dépôt de la Guerre, elle décrit la France juste avant l'industrialisation : le parcellaire agricole d'avant le remembrement, les forêts, et les bourgs avant l'arrivée du chemin de fer.",
    layer: "GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40",
    format: "image/jpeg",
    maxzoom: 15,
    minzoom: 6,
  },
  {
    id: "scan50-1950",
    shortLabel: "1950",
    label: "Carte de 1950",
    period: "vers 1950",
    context:
      "La carte topographique de l'après-guerre, avant les grands ensembles, les rocades et l'étalement pavillonnaire. C'est l'état de référence auquel se compare tout ce qui a été construit depuis.",
    layer: "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950",
    format: "image/jpeg",
    maxzoom: 15,
    minzoom: 3,
  },
  {
    id: "ortho-1950-1965",
    shortLabel: "1950-65",
    label: "Photographies aériennes",
    period: "1950-1965",
    context:
      "La première couverture photographique complète du territoire. À la différence des cartes, elle ne représente rien : elle enregistre. On y voit le bâti réel, les jardins, les friches — et souvent une campagne là où il y a aujourd'hui un lotissement.",
    layer: "ORTHOIMAGERY.ORTHOPHOTOS.1950-1965",
    format: "image/png",
    maxzoom: 18,
  },
  {
    id: "ortho-1965-1980",
    shortLabel: "1965-80",
    label: "Photographies aériennes",
    period: "1965-1980",
    context:
      "Les deux décennies qui ont le plus transformé le paysage français : grands ensembles, zones industrielles, remembrement agricole et premières rocades.",
    layer: "ORTHOIMAGERY.ORTHOPHOTOS.1965-1980",
    // Cette couche n'expose PAS le style `normal` : le passer renvoie un HTTP 400.
    style: "BDORTHOHISTORIQUE",
    format: "image/png",
    maxzoom: 18,
  },
  {
    id: "ortho-2000-2005",
    shortLabel: "2000-05",
    label: "Photographies aériennes",
    period: "2000-2005",
    context:
      "Le début des années 2000, assez proche pour reconnaître les lieux et assez ancien pour mesurer ce qui a été construit depuis.",
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
