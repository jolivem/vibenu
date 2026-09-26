import type { FloodWindow, FloodZone, FloodZoneGeometry } from "../domain/risk.types";
import type { FloodZoneProvider } from "./flood-zone.provider";
import { InMemoryCache } from "../../../server-shared/infrastructure/cache/in-memory-cache";

/**
 * Les zonages PPR d'inondation, lus au Géoportail de l'Urbanisme via le WFS de la
 * Géoplateforme.
 *
 * **Pourquoi cette source.** Les PPR étaient servis par la couche WMS `PPRN_ZONE_INOND` du
 * mapfile `risques` de Géorisques, définitivement cassé côté BRGM (cf. `riskLayers.ts`).
 * Ils sont aussi publiés comme servitudes d'utilité publique de catégorie `PM1`, que deux
 * services exposent : `apicarto.ign.fr/api/gpu/assiette-sup-s` et ce WFS. Mesuré sur une
 * fenêtre de 6 km, même donnée et même filtrage, apicarto contre WFS : Bordeaux 11,2 s
 * contre **1,4 s**, Saint-Cyr-l'École 8,5 s contre **0,9 s**. Le WFS gagne partout, et il
 * est sur `data.geopf.fr` que l'app interroge déjà pour ses fonds de carte.
 */
const WFS = "https://data.geopf.fr/wfs/ows";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const CACHE_VERSION = "v1"; // à incrémenter quand la forme de FloodZone change

/** Plafond WFS. Au-delà la réponse est tronquée, et on le signale. */
const MAX_FEATURES = 2000;

/**
 * La maille sur laquelle la fenêtre est arrondie, en degrés (~1,1 km).
 *
 * Arrondir **vers l'extérieur** fait deux choses d'un coup : deux adresses voisines
 * partagent la même clé de cache *et* la même réponse, et la fenêtre servie couvre
 * toujours celle demandée, puisqu'elle ne peut que grandir. Garder la clé et la requête
 * solidaires évite le piège classique — un hit de cache qui sert une fenêtre décalée de
 * plusieurs centaines de mètres.
 */
const CACHE_GRID_DEG = 0.01;

/**
 * Codes d'aléa retenus comme inondation.
 *
 * **Ces codes sont déduits d'observations, pas lus dans une spécification** : l'API ne
 * publie aucune nomenclature de `code_alea`. Relevé sur la Creuse, la Vendée littorale,
 * Chamonix, le Var, Bordeaux, Paris et le Vaucluse :
 *
 * - `11` — PPRI Bordeaux, PPRi de Paris, Ouvèze, ru de Gally, vallée de la Bièvre → inondation
 * - `12` — argiles, cavités, carrières, gypse
 * - `14` / `16` / `30` — avalanche / feu de forêt / minier
 * - `10` / `99` / absent — périmètres R111-3, PPR littoraux, PPR multirisque de montagne :
 *   ambigus, d'où le repli sur le libellé
 */
const FLOOD_ALEA = new Set(["11"]);
const NOT_FLOOD_ALEA = new Set(["12", "14", "16", "30"]);

/**
 * Dernier recours, quand l'aléa est ambigu, absent, ou que la jointure a échoué.
 *
 * Ce test **ne peut pas** être le critère principal, et c'est tout l'intérêt de la
 * jointure `code_alea` : à Vaison-la-Romaine, 17 assiettes sont toutes en aléa inondation
 * et ce motif n'en reconnaît que 2 — les autres s'appellent `OUVEZE_SEGURET`,
 * `AYGUES_Buisson`, des noms de rivière. À Guéret, le libellé est carrément `null`.
 * Élargi à `submersion` et `littoral` pour rattraper les PPR littoraux en aléa `99`.
 */
const FLOOD_NAME = /inondation|ppri|pprl|submersion|crue|torrentiel|littoral/i;

/**
 * Tolérance de simplification, en mètres, et plafond de points.
 *
 * Les emprises brutes sont inexploitables : à Bordeaux, le PPRI est publié en 214
 * assiettes d'environ 1 400 points chacune, soit **9 Mo de GeoJSON** pour une seule
 * fenêtre — écarter les polygones hors fenêtre n'y change presque rien, ils y sont tous.
 * 3 m valent ~0,5 px au zoom 14, donc l'œil n'y voit rien, et le poids tombe à 910 Ko.
 *
 * Le budget est la borne déterministe : tant qu'on le dépasse, la tolérance double. À
 * Bordeaux elle atterrit vers 10 m (327 Ko). Ne pas commencer plus haut : dès 10 m, les
 * petites zones disparaissent entièrement (214 assiettes tombent à 56), et une zone
 * inondable absente est pire qu'une zone approximative.
 */
const SIMPLIFY_TOLERANCE_M = 3;
const POINT_BUDGET = 40_000;
const MAX_TOLERANCE_DOUBLINGS = 4;

/** Précision de sortie : 5 décimales ≈ 1 m, inutile d'en servir plus pour un aplat. */
const COORD_DECIMALS = 5;

const METERS_PER_DEGREE_LAT = 111_320;

interface SupFeature {
  geometry: { type: string; coordinates: unknown } | null;
  properties: {
    idgen?: string | null;
    idass?: string | null;
    nomsuplitt?: string | null;
    nomass?: string | null;
    fichier?: string | null;
    suptype?: string | null;
    code_alea?: string | number | null;
  } | null;
}

interface WfsResponse {
  features?: SupFeature[];
  numberReturned?: number;
  numberMatched?: number;
}

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Le filtre OGC, en XML — deux chausse-trapes vérifiées sur le service :
 *
 * 1. La propriété géométrique s'appelle **`the_geom`**. Avec `geom`, le serveur répond
 *    `400 Illegal property name`.
 * 2. L'enveloppe déclarée en `urn:ogc:def:crs:EPSG::4326` suit l'ordre des axes de
 *    l'EPSG, donc **latitude d'abord**. Inverser rend silencieusement zéro objet, pas une
 *    erreur — un bug qui ne se voit qu'en comparant à la carte.
 *
 * `CQL_FILTER` n'est pas supporté (400), d'où ce XML plutôt qu'une expression courte.
 */
function buildFilter([west, south, east, north]: FloodWindow, suptype?: string): string {
  const bbox =
    `<fes:BBOX><fes:ValueReference>the_geom</fes:ValueReference>` +
    `<gml:Envelope srsName="urn:ogc:def:crs:EPSG::4326">` +
    `<gml:lowerCorner>${south} ${west}</gml:lowerCorner>` +
    `<gml:upperCorner>${north} ${east}</gml:upperCorner>` +
    `</gml:Envelope></fes:BBOX>`;

  const inner = suptype
    ? `<fes:And><fes:PropertyIsEqualTo><fes:ValueReference>suptype</fes:ValueReference>` +
      `<fes:Literal>${suptype}</fes:Literal></fes:PropertyIsEqualTo>${bbox}</fes:And>`
    : bbox;

  return (
    `<fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0" ` +
    `xmlns:gml="http://www.opengis.net/gml/3.2">${inner}</fes:Filter>`
  );
}

function buildWfsUrl(typeName: string, filter: string, propertyName?: string): string {
  const params = [
    "SERVICE=WFS",
    "VERSION=2.0.0",
    "REQUEST=GetFeature",
    `TYPENAMES=${typeName}`,
    "OUTPUTFORMAT=application/json",
    "SRSNAME=EPSG:4326",
    `COUNT=${MAX_FEATURES}`,
    ...(propertyName ? [`PROPERTYNAME=${propertyName}`] : []),
    `FILTER=${encodeURIComponent(filter)}`,
  ];
  return `${WFS}?${params.join("&")}`;
}

/** Arrondi de la fenêtre vers l'extérieur, sur la maille du cache. */
function snapWindow([west, south, east, north]: FloodWindow): FloodWindow {
  const floor = (v: number) => Math.floor(v / CACHE_GRID_DEG) * CACHE_GRID_DEG;
  const ceil = (v: number) => Math.ceil(v / CACHE_GRID_DEG) * CACHE_GRID_DEG;
  return [
    Number(floor(west).toFixed(2)),
    Number(floor(south).toFixed(2)),
    Number(ceil(east).toFixed(2)),
    Number(ceil(north).toFixed(2)),
  ];
}

type Bbox = [number, number, number, number];

function ringBbox(ring: number[][]): Bbox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

function bboxesOverlap(a: Bbox, b: Bbox): boolean {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

/**
 * Distance d'un point au segment, dans un espace où la longitude est remise à l'échelle
 * par `lonScale` (= cos de la latitude) : sans ça, un degré de longitude compterait autant
 * qu'un degré de latitude, et la simplification serait deux fois trop agressive
 * horizontalement en métropole.
 */
function perpendicularDistance(p: number[], a: number[], b: number[], lonScale: number): number {
  const px = p[0] * lonScale;
  const py = p[1];
  const ax = a[0] * lonScale;
  const ay = a[1];
  const bx = b[0] * lonScale;
  const by = b[1];
  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Douglas-Peucker, avec une pile explicite plutôt que la récursion.
 *
 * Écrit à la main : `turf` n'est pas une dépendance du projet, et l'algorithme tient en
 * vingt lignes. La pile évite de faire sauter le stack sur un anneau de 42 000 points,
 * comme il en existe à Bordeaux.
 *
 * L'anneau est fermé, donc ses deux extrémités sont le même point : quand tout l'anneau
 * tient sous la tolérance, il se réduit à ce point doublé et l'appelant le jette. C'est
 * ainsi que les zones minuscules disparaissent — assumé, et la raison de garder la
 * tolérance basse.
 */
function simplifyRing(ring: number[][], tolerance: number, lonScale: number): number[][] {
  const n = ring.length;
  if (n <= 4) return ring;

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxDistance = 0;
    let farthest = -1;
    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicularDistance(ring[i], ring[first], ring[last], lonScale);
      if (distance > maxDistance) {
        maxDistance = distance;
        farthest = i;
      }
    }
    if (farthest !== -1 && maxDistance > tolerance) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, last]);
    }
  }

  const out: number[][] = [];
  for (let i = 0; i < n; i += 1) if (keep[i]) out.push(ring[i]);
  return out;
}

function roundRing(ring: number[][]): number[][] {
  return ring.map(([x, y]) => [
    Number(x.toFixed(COORD_DECIMALS)),
    Number(y.toFixed(COORD_DECIMALS)),
  ]);
}

/** Les polygones d'une géométrie, que ce soit un `Polygon` ou un `MultiPolygon`. */
function toPolygons(geometry: SupFeature["geometry"]): number[][][][] | null {
  if (!geometry) return null;
  if (geometry.type === "MultiPolygon") return geometry.coordinates as number[][][][];
  if (geometry.type === "Polygon") return [geometry.coordinates as number[][][]];
  return null;
}

interface Reduced {
  geometry: FloodZoneGeometry;
  points: number;
}

/**
 * Réduction d'une emprise : on écarte d'abord les polygones hors fenêtre, puis on
 * simplifie ce qui reste.
 *
 * L'ordre compte. Une assiette de PPR est un `MultiPolygon` de dizaines de polygones
 * disjoints qui suivent une vallée sur des kilomètres ; n'en garder que ceux qui touchent
 * la fenêtre ne perd rien de visible et divise le volume par huit là où la donnée est
 * peu morcelée (Saint-Cyr : 147 polygones à 21). Là où elle l'est beaucoup, ça ne suffit
 * pas, et c'est la simplification qui prend le relais.
 */
function reduceGeometry(
  geometry: SupFeature["geometry"],
  window: FloodWindow,
  toleranceM: number,
  lonScale: number,
): Reduced | null {
  const polygons = toPolygons(geometry);
  if (!polygons) return null;

  const toleranceDeg = toleranceM / METERS_PER_DEGREE_LAT;
  const kept: number[][][][] = [];
  let points = 0;

  for (const polygon of polygons) {
    const outer = polygon[0];
    if (!outer || outer.length === 0) continue;
    if (!bboxesOverlap(ringBbox(outer), window as Bbox)) continue;

    const rings: number[][][] = [];
    for (const ring of polygon) {
      const simplified = roundRing(simplifyRing(ring, toleranceDeg, lonScale));
      // Sous 4 sommets, l'anneau n'a plus de surface : c'est une zone effacée par la
      // simplification, pas un polygone dégénéré de la source.
      if (simplified.length >= 4) rings.push(simplified);
    }
    // Un trou sans son contour extérieur n'a pas de sens : si l'extérieur est tombé, tout
    // le polygone tombe.
    if (rings.length === 0) continue;

    kept.push(rings);
    for (const ring of rings) points += ring.length;
  }

  if (kept.length === 0) return null;

  return {
    geometry: { type: "MultiPolygon", coordinates: kept },
    points,
  };
}

export class GpuFloodZoneProvider implements FloodZoneProvider {
  private static cache = new InMemoryCache<FloodZone[]>(SEVEN_DAYS);

  async getFloodZones(requested: FloodWindow): Promise<FloodZone[]> {
    const window = snapWindow(requested);
    const cacheKey = `${CACHE_VERSION}:${window.join(",")}`;

    const cached = GpuFloodZoneProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Les deux requêtes en parallèle : la jointure ne coûte donc rien en latence, le
      // tableau des générateurs pesant 1 à 75 Ko pour 0,2 à 0,4 s.
      const [assiettes, aleaByIdgen] = await Promise.all([
        this.fetchAssiettes(window),
        this.fetchAleaByIdgen(window),
      ]);

      if (!assiettes) return [];

      const zones = this.buildZones(assiettes, aleaByIdgen, window);
      GpuFloodZoneProvider.cache.set(cacheKey, zones);
      return zones;
    } catch (error) {
      console.warn("GPU flood zones error:", error);
      return [];
    }
  }

  private async fetchAssiettes(window: FloodWindow): Promise<SupFeature[] | null> {
    const url = buildWfsUrl("wfs_sup:assiette_sup_s", buildFilter(window, "pm1"));
    const body = await this.fetchJson(url, "assiette_sup_s");
    if (!body) return null;

    if ((body.numberMatched ?? 0) > (body.numberReturned ?? 0)) {
      console.warn(
        `GPU flood zones: réponse tronquée (${body.numberReturned}/${body.numberMatched} assiettes) ` +
          `— fenêtre trop large ou COUNT trop bas.`,
      );
    }
    return body.features ?? [];
  }

  /**
   * La table de jointure aléa, par identifiant de générateur.
   *
   * `code_alea` n'existe **que** sur le générateur, jamais sur l'assiette : c'est la seule
   * raison de cette seconde requête. `PROPERTYNAME` la rend quasi gratuite — le service
   * renvoie `geometry: null` et quelques kilo-octets.
   *
   * Une table vide est traitée comme suspecte et non comme « aucun aléa » : c'est
   * exactement ce que renvoie le service quand la BBOX est mal formée, et le silence
   * ferait basculer toutes les assiettes sur le repli par libellé.
   */
  private async fetchAleaByIdgen(window: FloodWindow): Promise<Map<string, string>> {
    const url = buildWfsUrl(
      "wfs_sup:generateur_sup_s",
      buildFilter(window, "pm1"),
      "idgen,code_alea,suptype",
    );
    const body = await this.fetchJson(url, "generateur_sup_s");
    const map = new Map<string, string>();
    if (!body) return map;

    for (const feature of body.features ?? []) {
      const idgen = feature.properties?.idgen;
      const alea = feature.properties?.code_alea;
      if (idgen && alea !== null && alea !== undefined) map.set(idgen, String(alea));
    }

    if (map.size === 0) {
      console.warn(
        "GPU flood zones: aucun générateur retourné — jointure d'aléa indisponible, " +
          "repli sur les libellés.",
      );
    }
    return map;
  }

  /**
   * Tri des assiettes, puis réduction de celles qui restent.
   *
   * Le budget de points est appliqué globalement et non par assiette : c'est le poids de
   * la réponse qui compte, pas celui d'une zone. Tant qu'il est dépassé, on recommence
   * avec une tolérance doublée — au pire quatre fois, pour que le temps de calcul reste
   * borné même sur une agglomération entière.
   */
  private buildZones(
    assiettes: SupFeature[],
    aleaByIdgen: Map<string, string>,
    window: FloodWindow,
  ): FloodZone[] {
    const flood = assiettes.filter((f) => this.isFlood(f, aleaByIdgen));
    if (flood.length === 0) return [];

    const midLat = (window[1] + window[3]) / 2;
    const lonScale = Math.cos((midLat * Math.PI) / 180);

    let tolerance = SIMPLIFY_TOLERANCE_M;
    for (let attempt = 0; ; attempt += 1) {
      const zones: FloodZone[] = [];
      let points = 0;

      for (const feature of flood) {
        const reduced = reduceGeometry(feature.geometry, window, tolerance, lonScale);
        if (!reduced) continue;
        points += reduced.points;
        zones.push({ label: this.labelOf(feature), geometry: reduced.geometry });
      }

      if (points <= POINT_BUDGET || attempt >= MAX_TOLERANCE_DOUBLINGS) {
        if (points > POINT_BUDGET) {
          console.warn(
            `GPU flood zones: budget dépassé (${points} points à ${tolerance} m) — servi tel quel.`,
          );
        }
        return zones;
      }
      tolerance *= 2;
    }
  }

  private isFlood(feature: SupFeature, aleaByIdgen: Map<string, string>): boolean {
    const idgen = feature.properties?.idgen;
    const alea = idgen ? aleaByIdgen.get(idgen) : undefined;

    if (alea && FLOOD_ALEA.has(alea)) return true;
    if (alea && NOT_FLOOD_ALEA.has(alea)) return false;

    // Aléa ambigu, absent, ou jointure manquante : on retombe sur les libellés.
    const p = feature.properties;
    const haystack = [p?.nomsuplitt, p?.nomass, p?.fichier].filter(Boolean).join(" ");
    return FLOOD_NAME.test(haystack);
  }

  /**
   * Le nom du plan, tel qu'il sera lu dans la popup.
   *
   * `nomsuplitt` est le libellé rédigé, donc le bon. Quand il manque, `nomass` le remplace
   * mais c'est un identifiant de fichier — « PM1_PPRn_MIRIBEL_ass » — qu'on dégrossit
   * plutôt que de l'afficher tel quel : le préfixe de catégorie et le suffixe d'assiette
   * n'apprennent rien au lecteur, le nom de la commune si.
   */
  private labelOf(feature: SupFeature): string {
    const p = feature.properties;
    const written = p?.nomsuplitt?.trim();
    if (written) return written;

    const technical = p?.nomass?.trim();
    if (!technical) return "Zonage PPR inondation";

    const cleaned = technical
      .replace(/^PM1[_-]/i, "")
      .replace(/[_-]ass$/i, "")
      .replace(/_+/g, " ")
      .trim();
    return cleaned || "Zonage PPR inondation";
  }

  /** Ne jette pas : un service muet doit laisser la carte s'afficher sans la couche. */
  private async fetchJson(url: string, label: string): Promise<WfsResponse | null> {
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        console.warn(`WFS ${label}: HTTP ${response.status}`);
        return null;
      }
      return (await response.json()) as WfsResponse;
    } catch (error) {
      console.warn(`WFS ${label} error:`, error);
      return null;
    }
  }
}
