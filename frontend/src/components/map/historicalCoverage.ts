import { ignTileUrlTemplate } from "./basemaps";
import { HISTORICAL_ERAS, type HistoricalEra } from "./historicalLayers";

/**
 * Sonde de couverture des couches historiques IGN.
 *
 * Aucune des couches de `HISTORICAL_ERAS` ne couvre tout le territoire, et **rien dans
 * le rendu ne le dit** : la couche historique est posée par-dessus l'ortho actuelle, qui
 * reste le fond. Là où la couche n'a pas de donnée, MapLibre ne dessine rien et le fond
 * transparaît — l'utilisateur voit la photographie d'aujourd'hui sous une pastille qui
 * annonce « 1965-80 ». C'est le cas de Saint-Cyr-l'École et de Versailles sur la couche
 * `ORTHOIMAGERY.ORTHOPHOTOS.1965-1980`.
 *
 * D'où cette sonde : une tuile par époque, au point demandé, avant de dresser la frise.
 *
 * ⚠️ L'absence de donnée prend **deux formes** sur la Géoplateforme, et une détection
 * qui n'en verrait qu'une laisserait passer l'autre :
 * - un `HTTP 404` portant `<Exception>No data found</Exception>` ;
 * - un `HTTP 200` avec une PNG palettisée de 1 595 octets, entièrement transparente.
 *
 * Les deux s'observent sur la même couche selon le zoom (à Versailles : tuile vide
 * jusqu'au zoom 16, 404 au-delà). Seul le second impose de regarder les pixels.
 */

/**
 * `unknown` n'est pas `missing` : une panne réseau ou un 500 passager ne doit pas faire
 * disparaître une pastille. Le doute profite à l'époque, qui reste proposée.
 */
export type EraCoverage = "covered" | "missing" | "unknown";

export type CoverageMap = Readonly<Record<string, EraCoverage>>;

/** Côté d'une tuile WMTS du TileMatrixSet PM, en pixels. */
const TILE_SIZE = 256;

/**
 * Demi-côté, en pixels, de la fenêtre examinée autour du point.
 *
 * La question posée n'est pas « cette tuile porte-t-elle de l'image ? » mais « y a-t-il
 * quelque chose à voir *à cette adresse* ? » : une tuile à demi couverte dont le trou
 * tombe pile sur le lieu ne vaut pas mieux qu'une tuile vide. 8 pixels valent une
 * trentaine de mètres au zoom 15, une dizaine au zoom 17.
 */
const SAMPLE_RADIUS_PX = 8;

/** Un canal alpha en dessous de ce seuil est du vide, pas de la donnée translucide. */
const ALPHA_THRESHOLD = 8;

export interface TilePoint {
  z: number;
  x: number;
  y: number;
  /** Position du point *dans* la tuile, en pixels (0-255). */
  px: number;
  py: number;
}

/**
 * Tuile PM contenant le point, et sa position à l'intérieur.
 *
 * Web Mercator sphérique, la projection du TileMatrixSet `PM` — la même que celle dont
 * MapLibre déduit `{x}`/`{y}`, sans quoi la sonde et la carte ne parleraient pas de la
 * même image.
 */
export function tileForPoint(lon: number, lat: number, z: number): TilePoint {
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  const fx = ((lon + 180) / 360) * n;
  const fy = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const x = Math.floor(fx);
  const y = Math.floor(fy);
  return {
    z,
    x,
    y,
    px: Math.min(TILE_SIZE - 1, Math.floor((fx - x) * TILE_SIZE)),
    py: Math.min(TILE_SIZE - 1, Math.floor((fy - y) * TILE_SIZE)),
  };
}

/**
 * Le zoom auquel sonder une époque : celui de l'affichage, ramené dans sa pyramide.
 *
 * Interroger la couche hors de sa plage renverrait une erreur de service — un `unknown`
 * qui ne dit rien de la couverture — au lieu du 404 ou de la tuile vide qui, eux,
 * répondent à la question.
 */
export function probeZoom(era: HistoricalEra, displayZoom: number): number {
  const min = era.minzoom ?? 0;
  return Math.max(min, Math.min(era.maxzoom, Math.round(displayZoom)));
}

export function historicalTileUrl(era: HistoricalEra, tile: TilePoint): string {
  return ignTileUrlTemplate(era.layer, { format: era.format, style: era.style })
    .replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
}

/**
 * Y a-t-il de l'image peinte autour de ce pixel ?
 *
 * Les couches JPEG (2000-2005) n'ont pas de canal alpha : le canvas les rend opaques, et
 * la fonction rend `true` dès que la tuile a été servie — ce qui est correct, leur seule
 * façon de dire « pas de donnée » étant le 404.
 *
 * Toute défaillance de décodage rend `true` : mieux vaut une pastille de trop qu'une
 * frise amputée par un navigateur sans `createImageBitmap`.
 */
async function hasPaintedPixels(blob: Blob, px: number, py: number): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return true;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const x0 = Math.max(0, px - SAMPLE_RADIUS_PX);
    const y0 = Math.max(0, py - SAMPLE_RADIUS_PX);
    const x1 = Math.min(canvas.width, px + SAMPLE_RADIUS_PX + 1);
    const y1 = Math.min(canvas.height, py + SAMPLE_RADIUS_PX + 1);

    const { data } = ctx.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > ALPHA_THRESHOLD) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Couverture d'une époque au point demandé. Ne lève pas. */
export async function probeEra(
  era: HistoricalEra,
  lon: number,
  lat: number,
  displayZoom: number,
  signal?: AbortSignal,
): Promise<EraCoverage> {
  const tile = tileForPoint(lon, lat, probeZoom(era, displayZoom));

  let response: Response;
  try {
    // `cache: "force-cache"` : la Géoplateforme sert ses tuiles avec un `max-age` de
    // trois semaines, et MapLibre demandera la même URL dès que l'époque sera choisie.
    // La sonde n'est alors pas un aller-retour de plus, c'est le préchargement.
    response = await fetch(historicalTileUrl(era, tile), { signal, cache: "force-cache" });
  } catch {
    // `AbortError` compris : l'appelant a changé de lieu, ce résultat n'intéresse plus.
    return "unknown";
  }

  // Le 404 est la réponse *documentée* de « pas de donnée ici ». Les autres statuts
  // (400 sur un style refusé, 5xx) parlent du service, pas du territoire.
  if (response.status === 404) return "missing";
  if (!response.ok) return "unknown";

  const blob = await response.blob().catch(() => null);
  if (!blob) return "unknown";

  return (await hasPaintedPixels(blob, tile.px, tile.py)) ? "covered" : "missing";
}

/** Sonde les époques en parallèle : six requêtes de tuile, servies par le cache ensuite. */
export async function probeHistoricalCoverage(
  lon: number,
  lat: number,
  displayZoom: number,
  signal?: AbortSignal,
): Promise<CoverageMap> {
  const results = await Promise.all(
    HISTORICAL_ERAS.map(async (era) => [era.id, await probeEra(era, lon, lat, displayZoom, signal)] as const),
  );
  return Object.fromEntries(results);
}

/** Les époques à proposer : tout sauf celles dont la sonde a conclu à l'absence. */
export function coveredEras(coverage: CoverageMap): readonly HistoricalEra[] {
  return HISTORICAL_ERAS.filter((era) => coverage[era.id] !== "missing");
}

/** Les époques écartées — nommées sous la frise, pour que le trou soit dit. */
export function missingEras(coverage: CoverageMap): readonly HistoricalEra[] {
  return HISTORICAL_ERAS.filter((era) => coverage[era.id] === "missing");
}

/**
 * L'époque de repli quand celle demandée n'est pas couverte : la plus proche dans la
 * frise, `null` (aujourd'hui) si aucune ne l'est.
 *
 * Proche au sens de la frise, donc du temps — pas la première de la liste. À l'échelle
 * d'une adresse, retomber sur Cassini depuis une photographie aérienne manquante
 * donnerait un aplat beige agrandi ×2 là où le voisin immédiat est une photographie
 * nette. À égalité de distance, l'époque la plus ancienne l'emporte : c'est le sens de
 * lecture de la card, qui va du passé vers aujourd'hui.
 */
export function nearestCoveredEraId(eraId: string, coverage: CoverageMap): string | null {
  const index = HISTORICAL_ERAS.findIndex((era) => era.id === eraId);
  if (index === -1) return null;

  for (let distance = 1; distance < HISTORICAL_ERAS.length; distance++) {
    for (const candidate of [HISTORICAL_ERAS[index - distance], HISTORICAL_ERAS[index + distance]]) {
      if (candidate && coverage[candidate.id] !== "missing") return candidate.id;
    }
  }
  return null;
}
