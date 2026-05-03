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
};

const VALID_CATEGORIES = new Set<string>([
  "school", "supermarket", "bakery", "pharmacy", "doctor",
  "park", "sport", "restaurant", "post_office", "bank", "library",
]);

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
 * Combined neighborhood provider using both OSM and BPE data from PostgreSQL.
 * - OSM provides: names, restaurants, parks, and general POIs
 * - BPE provides: official data (doctors, pharmacies, schools with INSEE counts)
 * Results are merged and deduplicated by category + proximity.
 */
export class CombinedNeighborhoodProvider implements NeighborhoodProvider {
  private static cache = new InMemoryCache<NeighborhoodPoi[]>(SEVEN_DAYS);

  // Bump when dedup/cap logic changes to invalidate stale entries.
  private static readonly CACHE_VERSION = "v5";

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
}
