import type { NeighborhoodProvider } from "./neighborhood.provider";
import type { NeighborhoodPoi, PoiCategory } from "../domain/neighborhood.types";
import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_NAMES: Record<string, string> = {
  school: "École",
  supermarket: "Supermarché",
  bakery: "Boulangerie",
  pharmacy: "Pharmacie",
  doctor: "Médecin",
  park: "Parc",
  sport: "Équipement sportif",
  restaurant: "Restaurant",
  post_office: "Bureau de poste",
  bank: "Banque",
  library: "Bibliothèque",
  hospital: "Hôpital",
  emergency: "Service d'urgences",
};

const VALID_CATEGORIES = new Set<string>([
  "school", "supermarket", "bakery", "pharmacy", "doctor",
  "park", "sport", "restaurant", "post_office", "bank", "library",
  "hospital", "emergency",
]);

/**
 * Le filet de sécurité : les équipements qu'on va chercher **au-delà** du rayon de
 * voisinage quand il n'y en a aucun à l'intérieur.
 *
 * Le rayon de 800 m répond à « qu'est-ce que j'ai au coin de la rue ». Pour un hôpital
 * ou un lycée, la question n'est pas là : elle est « à quelle distance ». En zone rurale,
 * une card qui ne dit rien parce que le collège est à 9 km laisse croire qu'il n'y en a
 * pas — c'est une absence d'information présentée comme une information.
 *
 * Ces recherches ne partent que si la catégorie manque à l'intérieur du rayon, donc
 * jamais en ville. Elles ne s'ajoutent pas au décompte qui sert à qualifier le voisinage :
 * un hôpital à 13 km ne rend pas un lieu mieux équipé (cf. `NeighborhoodServiceImpl`).
 */
const DISTANT_SEARCH_RADIUS_METERS = 30_000;

/** Combien on en veut, au maximum, quand on élargit. */
const DISTANT_CARE: Array<{ category: string; limit: number }> = [
  { category: "hospital", limit: 2 },
  { category: "emergency", limit: 1 },
];

/** Les niveaux scolaires cherchés un par un : manquer le lycée n'est pas manquer l'école. */
const DISTANT_SCHOOL_LEVELS: SchoolLevel[] = ["ecole", "college", "lycee"];

const PREFIX_NOISE = [
  "groupe scolaire",
  "ecole elementaire publique",
  "ecole elementaire privee",
  "ecole maternelle publique",
  "ecole maternelle privee",
  "ecole primaire publique",
  "ecole primaire privee",
  "ecole elementaire",
  "ecole maternelle",
  "ecole primaire",
  "ecole publique",
  "ecole privee",
  "college public",
  "college prive",
  "lycee professionnel",
  "lycee general",
  "lycee polyvalent",
  "ecole",
  "college",
  "lycee",
  "pharmacie",
  "boulangerie patisserie",
  "boulangerie",
  "patisserie",
  "supermarche",
  "bureau de poste",
  "la poste",
  "agence postale",
  "bibliotheque municipale",
  "bibliotheque",
  "mediatheque",
];

function normalizeName(name: string): string {
  let n = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const prefix of PREFIX_NOISE) {
    if (n.startsWith(prefix + " ")) {
      n = n.slice(prefix.length + 1);
      break;
    }
    if (n === prefix) {
      n = "";
      break;
    }
  }
  return n.trim();
}

const PROXIMITY_DEDUPE_METERS = 40;
const CROSS_CATEGORY_DEDUPE_METERS = 50;

// When the same name appears in multiple categories nearby, OSM amenity tags are
// usually more accurate than BPE for commercial POIs (BPE has known mis-classifications
// like banks tagged as post offices). Lower number = preferred when conflict resolved.
const SOURCE_PRIORITY: Record<string, number> = { osm: 0, bpe: 1 };

type SchoolLevel = "lycee" | "college" | "ecole" | "other";

function detectSchoolLevel(rawName: string | null): SchoolLevel {
  if (!rawName) return "other";
  const n = rawName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/\blycee\b/.test(n)) return "lycee";
  if (/\bcollege\b/.test(n)) return "college";
  if (/\b(ecole|maternelle|elementaire|primaire|groupe scolaire)\b/.test(n)) return "ecole";
  return "other";
}

// Descriptive words that don't identify an establishment — strip them out before
// comparing tokens so "LPO LYCEE DES METIERS FRESNEL" and "Lycée des métiers de
// l'optique Fresnel" both reduce to the discriminator "fresnel".
const TOKEN_STOPLIST = new Set([
  "ecole", "lycee", "college", "groupe", "scolaire", "ime", "section",
  "primaire", "elementaire", "maternelle", "secondaire", "enseignement",
  "publique", "publics", "privee", "prive", "general", "generale",
  "technologique", "professionnel", "professionnelle", "polyvalent", "polyvalente",
  "metiers", "etablissement", "regional", "academie", "academique",
  "optique", "adapte", "adaptee", "centre", "complexe", "cite",
  "saint", "sainte", "notre", "dame",
]);

function significantTokens(normalized: string): Set<string> {
  if (!normalized) return new Set();
  const tokens = new Set<string>();
  for (const t of normalized.split(/\s+/)) {
    if (t.length >= 4 && !TOKEN_STOPLIST.has(t)) tokens.add(t);
  }
  return tokens;
}

function sharesSignificantToken(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  for (const t of a) if (b.has(t)) return true;
  return false;
}

const TOKEN_PROXIMITY_METERS = 100;

/**
 * Deux lignes décrivant le même site peuvent porter des noms très inégaux.
 *
 * Un lycée est éclaté en sections dans les sources — au même point, on trouve
 * « Lycée Henri Becquerel », « LYCEE POLYVALENT HENRI BECQUEREL » et « Section
 * d'enseignement professionnel du lycée du lycée polyvalent Henri Becquerel ». Prendre
 * la première ligne par distance croissante, c'est tirer au sort entre les trois.
 *
 * On retient donc le plus proche, puis on regarde s'il existe, au même endroit, un nom
 * qui **commence** par le niveau : c'est la façon dont l'établissement se nomme, les
 * autres étant des rattachements administratifs.
 */
const SAME_SITE_METERS = 150;

function startsWithLevel(name: string, level: SchoolLevel): boolean {
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return n.startsWith(level);
}

function pickClearestName<T extends { name: string | null; distance_meters: number }>(
  rows: T[],
  level: SchoolLevel,
): T | null {
  if (rows.length === 0) return null;

  const nearest = rows.reduce((a, b) => (b.distance_meters < a.distance_meters ? b : a));
  const sameSite = rows.filter((r) => r.distance_meters - nearest.distance_meters <= SAME_SITE_METERS);

  // ⚠️ Surtout pas `normalizeName` ici : il retire précisément les préfixes « ecole »,
  // « college » et « lycee » (c'est son rôle pour la déduplication), donc le test
  // échouerait sur tous les noms, y compris les bons.
  const plain = sameSite.find((r) => r.name && startsWithLevel(r.name, level));
  return plain ?? nearest;
}

/**
 * Combined neighborhood provider using both OSM and BPE data from PostgreSQL.
 * - OSM provides: names, restaurants, parks, and general POIs
 * - BPE provides: official data (doctors, pharmacies, schools with INSEE counts)
 * Results are merged and deduplicated by category + proximity.
 */
export class CombinedNeighborhoodProvider implements NeighborhoodProvider {
  private static cache = new InMemoryCache<NeighborhoodPoi[]>(SEVEN_DAYS);

  // Bump when dedup/cap logic changes to invalidate stale entries.
  // v6 : ajout de la recherche élargie (soins, niveaux scolaires) hors du rayon.
  private static readonly CACHE_VERSION = "v6";

  async findNearbyPois(lat: number, lon: number, radiusMeters: number): Promise<NeighborhoodPoi[]> {
    const cacheKey = `${CombinedNeighborhoodProvider.CACHE_VERSION}:${buildGeoKey(lat, lon)}:${radiusMeters}`;
    const cached = CombinedNeighborhoodProvider.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Take top 25 per category (per source) so dense areas don't starve sparser
      // categories like schools — needed to find lycées behind many bakeries/banks.
      const rows = await query<{ name: string | null; category: string; distance_meters: number; source: string }>(
        `SELECT name, category, distance_meters, source
         FROM (
           SELECT name, category, distance_meters, source,
                  ROW_NUMBER() OVER (PARTITION BY category, source ORDER BY distance_meters ASC) AS rn
           FROM (
             SELECT name, category,
                    ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters,
                    'osm' AS source
             FROM osm_pois
             WHERE ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
             UNION ALL
             SELECT name, category,
                    ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters,
                    'bpe' AS source
             FROM bpe_equipment
             WHERE ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
           ) all_pois
         ) ranked
         WHERE rn <= 25
         ORDER BY distance_meters ASC`,
        [lon, lat, radiusMeters],
      );

      type Candidate = {
        name: string;
        normalizedName: string;
        category: PoiCategory;
        distance: number;
        source: string;
      };

      const candidates: Candidate[] = [];
      const countByCategory: Record<string, number> = {};
      const countBySchoolLevel: Record<string, number> = {};
      const seenNames: Set<string> = new Set();
      const keptByCategory: Record<string, { normalizedName: string; distance: number; subtype: string; tokens: Set<string> }[]> = {};
      const debug = process.env.DEBUG_NEIGHBORHOOD === "1";
      const schoolTrace: string[] = [];

      // Caps are deliberately higher than what the UI displays so the card can
      // detect truncation and show a "liste non exhaustive" hint.
      const SCHOOL_TOTAL_CAP = 10;
      const SCHOOL_PER_LEVEL_CAP = 4;
      const DEFAULT_CATEGORY_CAP = 6;

      for (const row of rows) {
        if (!VALID_CATEGORIES.has(row.category)) continue;

        const cap = row.category === "school" ? SCHOOL_TOTAL_CAP : DEFAULT_CATEGORY_CAP;
        const count = countByCategory[row.category] ?? 0;
        if (count >= cap) {
          if (debug && row.category === "school") schoolTrace.push(`SKIP (cap ${cap}): ${row.source} ${row.name} @${Math.round(row.distance_meters)}m`);
          continue;
        }

        let schoolLevel: SchoolLevel | null = null;
        if (row.category === "school") {
          schoolLevel = detectSchoolLevel(row.name);
          const levelCount = countBySchoolLevel[schoolLevel] ?? 0;
          if (levelCount >= SCHOOL_PER_LEVEL_CAP) {
            if (debug) schoolTrace.push(`SKIP (level cap ${schoolLevel}): ${row.source} ${row.name} @${Math.round(row.distance_meters)}m`);
            continue;
          }
        }

        const name = row.name || DEFAULT_NAMES[row.category] || row.category;
        const dist = Math.round(Number(row.distance_meters));
        const normalized = row.name ? normalizeName(row.name) : "";

        // For schools, scope the dedup by level: a Collège Buffon and Lycée Buffon
        // are physically distinct establishments even when they share a campus and name.
        const subtype = schoolLevel ?? "";
        const nameKey = `${row.category}:${subtype}:${normalized}`;
        if (normalized && seenNames.has(nameKey)) {
          if (debug && row.category === "school") schoolTrace.push(`SKIP (seen ${nameKey}): ${row.source} ${row.name} @${dist}m`);
          continue;
        }

        const kept = keptByCategory[row.category] ?? [];
        const tokens = significantTokens(normalized);
        const isDuplicateNearby = kept.some((k) => {
          if (k.subtype !== subtype) return false;
          const distDiff = Math.abs(k.distance - dist);
          if (distDiff <= PROXIMITY_DEDUPE_METERS) {
            // Tight proximity + same subtype: very likely same POI.
            if (!normalized || !k.normalizedName) return true;
            if (k.normalizedName === normalized) return true;
            if (k.normalizedName.includes(normalized) || normalized.includes(k.normalizedName)) return true;
            if (sharesSignificantToken(tokens, k.tokens)) return true;
            return false;
          }
          // Wider window: only dedup if names share a discriminating token (handles
          // same establishment described differently in BPE vs OSM).
          if (distDiff <= TOKEN_PROXIMITY_METERS && sharesSignificantToken(tokens, k.tokens)) {
            return true;
          }
          return false;
        });
        if (isDuplicateNearby) {
          if (debug && row.category === "school") schoolTrace.push(`SKIP (proximity): ${row.source} ${row.name} @${dist}m subtype=${subtype}`);
          continue;
        }

        if (normalized) seenNames.add(nameKey);
        kept.push({ normalizedName: normalized, distance: dist, subtype, tokens });
        keptByCategory[row.category] = kept;
        countByCategory[row.category] = count + 1;
        if (schoolLevel) {
          countBySchoolLevel[schoolLevel] = (countBySchoolLevel[schoolLevel] ?? 0) + 1;
        }
        if (debug && row.category === "school") schoolTrace.push(`KEEP: ${row.source} ${row.name} @${dist}m subtype=${subtype}`);

        candidates.push({
          name,
          normalizedName: normalized,
          category: row.category as PoiCategory,
          distance: dist,
          source: row.source,
        });
      }

      // Cross-category dedup: same name nearby but different categories → keep the
      // one from the more reliable source (OSM amenity tags > BPE classifications).
      const dropped = new Set<number>();
      for (let i = 0; i < candidates.length; i++) {
        if (dropped.has(i)) continue;
        const a = candidates[i];
        if (!a.normalizedName) continue;
        for (let j = i + 1; j < candidates.length; j++) {
          if (dropped.has(j)) continue;
          const b = candidates[j];
          if (!b.normalizedName) continue;
          if (a.category === b.category) continue;
          if (Math.abs(a.distance - b.distance) > CROSS_CATEGORY_DEDUPE_METERS) continue;
          if (a.normalizedName !== b.normalizedName) continue;

          const aPriority = SOURCE_PRIORITY[a.source] ?? 99;
          const bPriority = SOURCE_PRIORITY[b.source] ?? 99;
          const loserIdx = aPriority <= bPriority ? j : i;
          dropped.add(loserIdx);
          if (loserIdx === i) break;
        }
      }

      candidates.forEach((c, idx) => {
        if (dropped.has(idx) && debug && c.category === "school") {
          schoolTrace.push(`DROP (cross-category): ${c.source} ${c.name} @${c.distance}m`);
        }
      });

      const pois: NeighborhoodPoi[] = candidates
        .filter((_, idx) => !dropped.has(idx))
        .map((c) => ({
          name: c.name,
          category: c.category,
          distanceMeters: c.distance,
        }));

      // Les manquants structurants, cherchés plus loin. En bout de chaîne : ils ne
      // passent ni par la déduplication ni par les plafonds ci-dessus, qui règlent la
      // densité d'un voisinage — hors sujet pour un équipement unique à 10 km.
      pois.push(...(await this.findDistantEssentials(lat, lon, radiusMeters, pois)));

      if (debug) {
        const schoolRowsCount = rows.filter((r) => r.category === "school").length;
        console.log(`[neighborhood] ${schoolRowsCount} school rows from SQL for (${lat},${lon}) r=${radiusMeters}`);
        for (const line of schoolTrace) console.log(`  ${line}`);
      }

      CombinedNeighborhoodProvider.cache.set(cacheKey, pois);
      return pois;
    } catch (error) {
      console.error("Combined neighborhood provider error:", error);
      return [];
    }
  }

  /**
   * Va chercher au loin les équipements structurants absents du rayon de voisinage.
   *
   * Ne lève jamais : c'est un complément, et une requête qui échoue doit coûter deux
   * lignes de card, pas la card entière. D'où le `try` par famille plutôt qu'un seul
   * englobant — un hôpital introuvable ne doit pas emporter le lycée.
   */
  private async findDistantEssentials(
    lat: number,
    lon: number,
    ringRadius: number,
    found: NeighborhoodPoi[],
  ): Promise<NeighborhoodPoi[]> {
    const out: NeighborhoodPoi[] = [];

    // On compte ce qu'on a déjà : trouver un hôpital sur deux dans le rayon doit faire
    // chercher le second, pas renoncer.
    const countByCategory = new Map<string, number>();
    for (const poi of found) {
      countByCategory.set(poi.category, (countByCategory.get(poi.category) ?? 0) + 1);
    }
    const missingCare = DISTANT_CARE.map((want) => ({
      ...want,
      missing: want.limit - (countByCategory.get(want.category) ?? 0),
    })).filter((want) => want.missing > 0);

    const levelsFound = new Set(
      found.filter((p) => p.category === "school").map((p) => detectSchoolLevel(p.name)),
    );
    const missingLevels = DISTANT_SCHOOL_LEVELS.filter((level) => !levelsFound.has(level));

    if (missingCare.length > 0) {
      try {
        const rows = await query<{ name: string | null; category: string; distance_meters: number }>(
          `SELECT name, category,
                  ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters
             FROM bpe_equipment
            WHERE category = ANY($3)
              AND ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $4)
            ORDER BY distance_meters ASC
            LIMIT 40`,
          [lon, lat, missingCare.map((w) => w.category), DISTANT_SEARCH_RADIUS_METERS],
        );

        const taken = new Map<string, number>();
        const seen = new Set<string>();
        for (const row of rows) {
          if (row.distance_meters <= ringRadius) continue;
          const want = missingCare.find((w) => w.category === row.category);
          if (!want) continue;
          if ((taken.get(row.category) ?? 0) >= want.missing) continue;

          // Un même établissement est souvent éclaté en plusieurs lignes BPE (un site
          // par service). Sans ce filtre, « les 2 hôpitaux les plus proches » rendrait
          // deux fois le même centre hospitalier.
          const key = `${row.category}:${normalizeName(row.name ?? "")}`;
          if (row.name && seen.has(key)) continue;
          if (row.name) seen.add(key);

          taken.set(row.category, (taken.get(row.category) ?? 0) + 1);
          out.push({
            name: row.name || DEFAULT_NAMES[row.category] || row.category,
            category: row.category as PoiCategory,
            distanceMeters: Math.round(Number(row.distance_meters)),
          });
        }
      } catch (error) {
        console.warn("[neighborhood] recherche élargie (soins) échouée:", error);
      }
    }

    if (missingLevels.length > 0) {
      try {
        // Le niveau se déduit du nom, pas d'une colonne : impossible de filtrer en SQL.
        // On remonte donc les écoles par distance croissante et on s'arrête au premier
        // exemplaire de chaque niveau manquant.
        const rows = await query<{ name: string | null; distance_meters: number }>(
          `SELECT name, distance_meters FROM (
             SELECT name, ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters
               FROM osm_pois
              WHERE category = 'school'
                AND ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
             UNION ALL
             SELECT name, ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters
               FROM bpe_equipment
              WHERE category = 'school'
                AND ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
           ) schools
           ORDER BY distance_meters ASC
           LIMIT 400`,
          [lon, lat, DISTANT_SEARCH_RADIUS_METERS],
        );

        const beyondRing = rows.filter((row) => row.distance_meters > ringRadius);
        for (const level of missingLevels) {
          const atLevel = beyondRing.filter((row) => detectSchoolLevel(row.name) === level);
          const best = pickClearestName(atLevel, level);
          if (!best) continue;
          out.push({
            name: best.name || DEFAULT_NAMES.school,
            category: "school",
            distanceMeters: Math.round(Number(best.distance_meters)),
          });
        }
      } catch (error) {
        console.warn("[neighborhood] recherche élargie (enseignement) échouée:", error);
      }
    }

    return out.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }
}
