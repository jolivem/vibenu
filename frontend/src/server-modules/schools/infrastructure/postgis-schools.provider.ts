import { query } from "@/server-shared/infrastructure/database/postgres";
import { InMemoryCache, buildGeoKey } from "@/server-shared/infrastructure/cache/in-memory-cache";
import { toDisplayName } from "@/server-modules/neighborhood/infrastructure/poi-display-name";
import {
  COLLEGE_RADIUS_M,
  LYCEE_RADIUS_M,
  type NearbySchool,
  type NearbySchools,
  type SchoolLevel,
  type SchoolOfferCode,
  type SchoolVoie,
} from "../domain/schools.types";
import {
  DATASETS,
  SQL_NUM,
  brevetOf,
  depOfCommune,
  elevesParDivisionOf,
  insertionOf,
  ipsOf,
  languesOf,
  lyceeExamOf,
  type DepartmentReferences,
  type SchoolDataRow,
} from "./school-data.parse";
import type { SchoolsProvider, SchoolsQuery } from "./schools.provider";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/** Au-delà, la liste n'est plus lisible ; les plus proches d'abord. */
const MAX_PER_LEVEL = 10;
/** En mode commune, une grande ville compte une vingtaine de lycées : on les garde tous. */
const MAX_PER_LEVEL_COMMUNE = 30;
/** À la campagne, le rayon peut être vide : on garde au moins les plus proches. */
const MIN_PER_LEVEL = 3;
/** Candidats lus par l'index KNN avant le tri par distance réelle. */
const KNN_CANDIDATES = 60;

interface EstablishmentRow {
  uai: string;
  nom: string;
  type: SchoolLevel;
  secteur: "public" | "prive";
  education_prioritaire: string | null;
  voie_generale: boolean;
  voie_technologique: boolean;
  voie_professionnelle: boolean;
  restauration: boolean;
  hebergement: boolean;
  post_bac: boolean;
  apprentissage: boolean;
  lycee_agricole: boolean;
  lycee_des_metiers: boolean;
  section_europeenne: boolean;
  section_internationale: boolean;
  section_sport: boolean;
  section_arts: boolean;
  section_cinema: boolean;
  section_theatre: boolean;
  site_web: string | null;
  fiche_onisep: string | null;
  code_commune: string;
  nom_commune: string | null;
  lat: number;
  lon: number;
  distance: number;
}

const ESTABLISHMENT_COLUMNS = `
  e.uai, e.nom, e.type, e.secteur, e.education_prioritaire,
  e.voie_generale, e.voie_technologique, e.voie_professionnelle,
  e.restauration, e.hebergement, e.post_bac, e.apprentissage,
  e.lycee_agricole, e.lycee_des_metiers,
  e.section_europeenne, e.section_internationale, e.section_sport,
  e.section_arts, e.section_cinema, e.section_theatre,
  e.site_web, e.fiche_onisep, e.code_commune, e.nom_commune,
  ST_Y(e.geom) AS lat, ST_X(e.geom) AS lon`;

interface ReferenceRow {
  kind: "brevet" | "bac_gt" | "bac_pro" | "es";
  dep: string;
  niveau: string | null;
  valeur: string | null;
}

export class PostgisSchoolsProvider implements SchoolsProvider {
  private static cache = new InMemoryCache<NearbySchools | null>(SEVEN_DAYS);

  async getNearbySchools(q: SchoolsQuery): Promise<NearbySchools | null> {
    const cacheKey =
      (q.scope === "commune" ? `commune:${q.codeCommune}` : `rayon:${buildGeoKey(q.lat, q.lon)}`) +
      `:${q.sectorCollege ?? ""}`;
    const cached = PostgisSchoolsProvider.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const [nearColleges, lycees] = await Promise.all([
        this.selectEstablishments(q, "college"),
        this.selectEstablishments(q, "lycee"),
      ]);
      const sector = q.sectorCollege ? await this.findSectorCollege(q, nearColleges) : null;
      const colleges =
        sector && !nearColleges.some((c) => c.uai === sector.uai)
          ? [...nearColleges, sector].sort((a, b) => a.distance - b.distance)
          : nearColleges;
      const all = [...colleges, ...lycees];
      const [data, references] = await Promise.all([
        this.readData(all.map((e) => e.uai)),
        this.readReferences([...new Set(all.map((e) => depOfCommune(e.code_commune)))]),
      ]);

      const build = (e: EstablishmentRow) => ({
        ...toNearbySchool(e, data.get(e.uai) ?? new Map(), references),
        estSecteur: e.uai === sector?.uai,
        horsCommune: q.scope === "commune" && e.code_commune !== q.codeCommune,
      });
      const result: NearbySchools = {
        scope: q.scope,
        rayonColleges: COLLEGE_RADIUS_M,
        rayonLycees: LYCEE_RADIUS_M,
        colleges: colleges.map(build),
        lycees: lycees.map(build),
      };
      PostgisSchoolsProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("PostgisSchoolsProvider error:", error);
      return null;
    }
  }

  /**
   * Mode rayon : les établissements à moins du rayon de leur niveau, complétés par les
   * plus proches s'il y en a moins de `MIN_PER_LEVEL`. L'index KNN (`<->`, en degrés)
   * présélectionne, la distance en `geography` trie et filtre.
   */
  private async selectEstablishments(q: SchoolsQuery, level: SchoolLevel): Promise<EstablishmentRow[]> {
    if (q.scope === "commune") {
      const inside = await query<EstablishmentRow>(
        `SELECT ${ESTABLISHMENT_COLUMNS},
                ST_Distance(e.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance
           FROM school_establishment e
          WHERE e.type = $3 AND e.code_commune = $4
          ORDER BY e.nom
          LIMIT $5`,
        [q.lat, q.lon, level, q.codeCommune, MAX_PER_LEVEL_COMMUNE],
      );
      if (inside.length >= MIN_PER_LEVEL) return inside;
      // Neuf communes sur dix n'ont pas de collège : sans ce complément, la section
      // disparaîtrait de la plupart des analyses de commune. On prend les plus proches du
      // centre, hors de la commune, jusqu'à en avoir trois.
      const outside = await query<EstablishmentRow>(
        `WITH pt AS (SELECT ST_SetSRID(ST_MakePoint($2, $1), 4326) AS g)
         SELECT ${ESTABLISHMENT_COLUMNS},
                ST_Distance(e.geom::geography, pt.g::geography) AS distance
           FROM school_establishment e, pt
          WHERE e.type = $3 AND e.code_commune <> $4
          ORDER BY e.geom <-> pt.g
          LIMIT $5`,
        [q.lat, q.lon, level, q.codeCommune, MIN_PER_LEVEL - inside.length],
      );
      return [...inside, ...outside.sort((a, b) => a.distance - b.distance)];
    }
    const radius = level === "college" ? COLLEGE_RADIUS_M : LYCEE_RADIUS_M;
    return query<EstablishmentRow>(
      `WITH pt AS (SELECT ST_SetSRID(ST_MakePoint($2, $1), 4326) AS g),
            knn AS (
              SELECT ${ESTABLISHMENT_COLUMNS},
                     ST_Distance(e.geom::geography, pt.g::geography) AS distance
                FROM school_establishment e, pt
               WHERE e.type = $3
               ORDER BY e.geom <-> pt.g
               LIMIT $4),
            ranked AS (SELECT knn.*, row_number() OVER (ORDER BY distance) AS rang FROM knn)
       SELECT * FROM ranked
        WHERE distance <= $5 OR rang <= $6
        ORDER BY distance
        LIMIT $7`,
      [q.lat, q.lon, level, KNN_CANDIDATES, radius, MIN_PER_LEVEL, MAX_PER_LEVEL],
    );
  }

  /**
   * Le collège de secteur, retrouvé par son nom : d'abord parmi les collèges déjà choisis,
   * sinon parmi ceux de la ville (code commune de l'arrondissement analysé : 751xx). Le
   * plus proche l'emporte si deux collèges portent le même nom.
   */
  private async findSectorCollege(q: SchoolsQuery, near: EstablishmentRow[]): Promise<EstablishmentRow | null> {
    const target = normalizeCollegeName(q.sectorCollege ?? "");
    if (!target) return null;
    const inList = near.find((c) => normalizeCollegeName(c.nom) === target);
    if (inList) return inList;
    const candidates = await query<EstablishmentRow>(
      `SELECT ${ESTABLISHMENT_COLUMNS},
              ST_Distance(e.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance
         FROM school_establishment e
        WHERE e.type = 'college' AND e.code_commune LIKE '751%'
        ORDER BY distance`,
      [q.lat, q.lon],
    );
    return candidates.find((c) => normalizeCollegeName(c.nom) === target) ?? null;
  }

  /** Dernière année publiée de chaque jeu, par établissement ; toutes les lignes de cette année. */
  private async readData(uais: string[]): Promise<Map<string, Map<string, SchoolDataRow[]>>> {
    const byUai = new Map<string, Map<string, SchoolDataRow[]>>();
    if (uais.length === 0) return byUai;
    // Une année au plus de retard sur la dernière publication du jeu : un lycée qui n'a
    // plus de bac général depuis 2016 ne doit pas l'afficher comme s'il était récent.
    const rows = await query<SchoolDataRow & { uai: string }>(
      `WITH latest AS (
         SELECT dataset, max(annee) AS annee FROM school_data WHERE dataset = ANY($2) GROUP BY dataset)
       SELECT dataset, uai, annee, data FROM (
         SELECT d.dataset, d.uai, d.annee, d.data,
                rank() OVER (PARTITION BY d.dataset, d.uai ORDER BY d.annee DESC NULLS LAST) AS r
           FROM school_data d
           JOIN latest l ON l.dataset = d.dataset
          WHERE d.uai = ANY($1) AND d.dataset = ANY($2)
            AND (d.annee IS NULL OR l.annee IS NULL OR d.annee >= l.annee - 1)) t
        WHERE r = 1`,
      [uais, Object.values(DATASETS)],
    );
    for (const row of rows) {
      let datasets = byUai.get(row.uai);
      if (!datasets) byUai.set(row.uai, (datasets = new Map()));
      const list = datasets.get(row.dataset) ?? [];
      list.push(row);
      datasets.set(row.dataset, list);
    }
    return byUai;
  }

  /**
   * Moyennes départementales de la dernière année : réussite au brevet et au bac
   * (pondérées par les candidats), élèves par division par niveau (rapport des sommes
   * publiées, comme la DEPP le calcule). Les lignes « Total Département » de l'encadrement
   * mêlent tous les niveaux : on ne s'en sert pas.
   */
  private async readReferences(deps: string[]): Promise<DepartmentReferences> {
    const refs: DepartmentReferences = new Map();
    if (deps.length === 0) return refs;
    const dep = `ltrim(data->>'code_departement', '0')`;
    const weighted = (dataset: string, kind: string, taux: string, effectif: string) => `
      SELECT '${kind}' AS kind, ${dep} AS dep, NULL AS niveau,
             (sum(${SQL_NUM(taux)} * ${SQL_NUM(effectif)}) / NULLIF(sum(${SQL_NUM(effectif)}), 0))::text AS valeur
        FROM school_data
       WHERE dataset = '${dataset}' AND uai IS NOT NULL AND ${dep} = ANY($1)
         AND annee = (SELECT max(annee) FROM school_data WHERE dataset = '${dataset}')
         AND ${SQL_NUM(taux)} IS NOT NULL
       GROUP BY 2`;
    const rows = await query<ReferenceRow>(
      `${weighted(DATASETS.ivac, "brevet", "taux_de_reussite_g", "nb_candidats_g")}
       UNION ALL
       ${weighted(DATASETS.ivalGt, "bac_gt", "taux_reu_total", "presents_total")}
       UNION ALL
       ${weighted(DATASETS.ivalPro, "bac_pro", "taux_reu_total", "presents_total")}
       UNION ALL
       SELECT 'es', ${dep}, data->>'niveau',
              (sum(${SQL_NUM("numerateur_e_s_nb_eleves_structure_pondere_nb_heures_enseignement_structure")})
                / NULLIF(sum(${SQL_NUM("denominateur_e_s_nb_heures_enseignement_hebdo_devant_eleves")}), 0))::text
         FROM school_data
        WHERE dataset IN ('${DATASETS.encadrementPublic}', '${DATASETS.encadrementPrive}')
          AND uai IS NOT NULL AND ${dep} = ANY($1)
          AND annee = (SELECT max(annee) FROM school_data WHERE dataset = '${DATASETS.encadrementPublic}')
        GROUP BY 2, 3`,
      [deps],
    );
    for (const r of rows) {
      if (r.valeur === null) continue;
      refs.set(`${r.kind}|${r.dep}|${r.niveau ?? ""}`, Number(r.valeur));
    }
    return refs;
  }
}

function toNearbySchool(
  e: EstablishmentRow,
  data: Map<string, SchoolDataRow[]>,
  refs: DepartmentReferences,
): NearbySchool {
  const dep = depOfCommune(e.code_commune);
  const rows = (dataset: string) => data.get(dataset) ?? [];

  const voies: SchoolVoie[] = [];
  if (e.voie_generale) voies.push("generale");
  if (e.voie_technologique) voies.push("technologique");
  if (e.voie_professionnelle) voies.push("professionnelle");

  const sports = [
    ...new Set(
      rows(DATASETS.sectionsSportives).flatMap((r) => {
        const v = r.data.sections_scolaires;
        return (Array.isArray(v) ? v : typeof v === "string" ? [v] : []).map((s) => toDisplayName(String(s)));
      }),
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));

  const label = rows(DATASETS.lyceesMetiers)[0]?.data.intitule_du_label;
  const labelMetiers = typeof label === "string" && label.trim() ? label.trim() : null;

  const offre: SchoolOfferCode[] = [];
  const add = (cond: boolean, code: SchoolOfferCode) => cond && offre.push(code);
  add(e.restauration, "cantine");
  add(e.hebergement, "internat");
  add(e.post_bac, "post_bac");
  add(e.apprentissage, "apprentissage");
  add(e.lycee_agricole, "agricole");
  add(e.lycee_des_metiers || labelMetiers !== null, "metiers");
  add(e.section_europeenne, "europeenne");
  add(e.section_internationale, "internationale");
  add(e.section_sport || sports.length > 0, "sport");
  add(e.section_arts, "arts");
  add(e.section_cinema, "cinema");
  add(e.section_theatre, "theatre");

  const ep = e.education_prioritaire;
  const isLycee = e.type === "lycee";
  // Un lycée sans voie générale ni technologique est un lycée professionnel : c'est son
  // encadrement de LP qui le décrit.
  const lyceeGt = e.voie_generale || e.voie_technologique || !e.voie_professionnelle;

  return {
    uai: e.uai,
    nom: e.nom,
    level: e.type,
    secteur: e.secteur,
    educationPrioritaire: ep === "REP" || ep === "REP+" ? ep : null,
    voies: isLycee ? voies : [],
    offre,
    sports,
    langues: languesOf(rows(DATASETS.langues)),
    labelMetiers,
    lat: Number(e.lat),
    lon: Number(e.lon),
    distance: Math.round(Number(e.distance)),
    estSecteur: false,
    nomCommune: e.nom_commune,
    horsCommune: false,
    brevet: isLycee ? null : brevetOf(rows(DATASETS.ivac)[0], refs, dep),
    bacGt: isLycee ? lyceeExamOf(rows(DATASETS.ivalGt)[0], refs, dep, "bac_gt") : null,
    bacPro: isLycee ? lyceeExamOf(rows(DATASETS.ivalPro)[0], refs, dep, "bac_pro") : null,
    ips: ipsOf(e.type, rows(isLycee ? DATASETS.ipsLycees : DATASETS.ipsColleges)[0]),
    elevesParDivision: elevesParDivisionOf(
      [...rows(DATASETS.encadrementPublic), ...rows(DATASETS.encadrementPrive)],
      !isLycee ? "Collège" : lyceeGt ? "Lycée général et technologique" : "Lycée professionnel",
      refs,
      dep,
    ),
    insertion: isLycee ? insertionOf(rows(DATASETS.inserjeunes)) : null,
    ficheOnisep: e.fiche_onisep,
    siteWeb: e.site_web,
  };
}

/** « Collège Madame de Staël » et « MADAME DE STAEL » donnent tous deux « MADAME DE STAEL ». */
function normalizeCollegeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\b(COLLEGE|PRIVE|PUBLIC)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
