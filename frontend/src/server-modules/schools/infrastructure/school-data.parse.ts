/**
 * Lecture des lignes de `school_data`, gardées telles que publiées par data.education.gouv.fr.
 *
 * C'est la seule couche qui connaît les noms de colonnes de chaque jeu, et leurs caprices :
 * nombres tantôt numériques, tantôt en texte (« 22.89 », « 91,9% »), codes de département
 * avec ou sans zéros de tête (« 075 », « 75 »), années de rentrée écrites « 2025-2026 ».
 *
 * Une valeur absente reste `null` — en particulier une valeur ajoutée que la DEPP n'a pas
 * calculée sous son seuil d'effectif : « non publié », jamais 0.
 */
import type { SchoolExamResult, SchoolIndicator, SchoolLevel, NearbySchool } from "../domain/schools.types";

/** Les jeux lus par l'écran, parmi ceux qu'importe scripts/import_schools.py. */
export const DATASETS = {
  ivac: "fr-en-indicateurs-valeur-ajoutee-colleges",
  ivalGt: "fr-en-indicateurs-de-resultat-des-lycees-gt_v2",
  ivalPro: "fr-en-indicateurs-de-resultat-des-lycees-pro_v2",
  ipsColleges: "fr-en-ips-colleges-ap2023",
  ipsLycees: "fr-en-ips-lycees-ap2023",
  encadrementPublic: "fr-en-moyens_enseignants_2d_public",
  encadrementPrive: "fr-en-moyens_enseignants_2d_prive",
  inserjeunes: "fr-en-inserjeunes-lycee_pro",
  langues: "fr-en-offre-langues-2d",
  sectionsSportives: "fr-en-sections-sportives-scolaires",
  lyceesMetiers: "fr-en-lycees-metiers",
} as const;

export interface SchoolDataRow {
  dataset: string;
  annee: number | null;
  data: Record<string, unknown>;
}

/** Moyennes départementales, clé `${kind}|${dep}|${niveau}` (niveau vide hors encadrement). */
export type DepartmentReferences = Map<string, number>;

/** Expression SQL : le champ `key` de `data`, converti en nombre quelle que soit sa forme publiée. */
export function SQL_NUM(key: string): string {
  return `NULLIF(regexp_replace(replace(data->>'${key}', ',', '.'), '[^0-9.-]', '', 'g'), '')::numeric`;
}

/** Un nombre publié en nombre ou en texte (« 22.89 », « 91,9% »). */
export function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(",", ".").replace(/[^0-9.-]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Code de département sans zéro de tête, à partir d'un code commune INSEE (« 01001 » → « 1 », « 97411 » → « 974 »). */
export function depOfCommune(codeCommune: string): string {
  const raw = codeCommune.startsWith("97") ? codeCommune.slice(0, 3) : codeCommune.slice(0, 2);
  return raw.replace(/^0+/, "");
}

function round1(n: number | null): number | null {
  return n === null ? null : Math.round(n * 10) / 10;
}

/** Brevet (IVAC) : réussite, valeur ajoutée, note à l'écrit ; part de mentions calculée sur les candidats. */
export function brevetOf(row: SchoolDataRow | undefined, refs: DepartmentReferences, dep: string): SchoolExamResult | null {
  if (!row || row.annee === null) return null;
  const d = row.data;
  const candidats = num(d.nb_candidats_g);
  const mentions = num(d.nb_mentions_global_g);
  return {
    annee: row.annee,
    candidats,
    tauxReussite: num(d.taux_de_reussite_g),
    vaReussite: num(d.va_du_taux_de_reussite_g),
    tauxReussiteDepartement: round1(refs.get(`brevet|${dep}|`) ?? null),
    tauxMentions: candidats && mentions !== null ? Math.round((mentions / candidats) * 100) : null,
    vaMentions: null,
    noteEcrit: num(d.note_a_l_ecrit_g),
    vaNote: num(d.va_de_la_note_g),
  };
}

/** Bac général et technologique ou professionnel (IVAL) : réussite et mentions, avec leurs valeurs ajoutées. */
export function lyceeExamOf(
  row: SchoolDataRow | undefined,
  refs: DepartmentReferences,
  dep: string,
  kind: "bac_gt" | "bac_pro",
): SchoolExamResult | null {
  if (!row || row.annee === null) return null;
  const d = row.data;
  const tauxReussite = num(d.taux_reu_total);
  if (tauxReussite === null) return null;
  return {
    annee: row.annee,
    candidats: num(d.presents_total),
    tauxReussite,
    vaReussite: num(d.va_reu_total),
    tauxReussiteDepartement: round1(refs.get(`${kind}|${dep}|`) ?? null),
    tauxMentions: num(d.taux_men_total),
    vaMentions: num(d.va_men_total),
    noteEcrit: null,
    vaNote: null,
  };
}

/**
 * IPS de l'établissement et moyenne départementale publiée à côté. Pour un lycée, la
 * référence est celle de son type (LEGT, LPO, LP) : un lycée professionnel se compare
 * aux lycées professionnels.
 */
export function ipsOf(level: SchoolLevel, row: SchoolDataRow | undefined): SchoolIndicator | null {
  if (!row || row.annee === null) return null;
  const d = row.data;
  if (level === "college") {
    const valeur = num(d.ips);
    return valeur === null ? null : { annee: row.annee, valeur, departement: num(d.ips_departemental) };
  }
  const valeur = num(d.ips_etab);
  const type = String(d.type_de_lycee ?? "").toLowerCase();
  return valeur === null
    ? null
    : { annee: row.annee, valeur, departement: num(d[`ips_departemental_${type}`]) };
}

/** Élèves par division (E/S) au niveau de l'établissement, et la moyenne du département pour ce niveau. */
export function elevesParDivisionOf(
  rows: SchoolDataRow[],
  niveau: string,
  refs: DepartmentReferences,
  dep: string,
): SchoolIndicator | null {
  const row = rows.find((r) => r.data.niveau === niveau);
  const valeur = row ? num(row.data.e_s) : null;
  if (!row || row.annee === null || valeur === null) return null;
  return {
    annee: row.annee,
    valeur: Math.round(valeur * 10) / 10,
    departement: round1(refs.get(`es|${dep}|${niveau}`) ?? null),
  };
}

/** Insertion des sortants de la voie professionnelle (Inserjeunes), apprentis et scolaires ensemble. */
export function insertionOf(rows: SchoolDataRow[]): NearbySchool["insertion"] {
  const row = rows.find((r) => r.data.dont_apprentis_eple === "ensemble") ?? rows[0];
  if (!row || row.annee === null) return null;
  const d = row.data;
  const tauxEmploi6Mois = num(d.taux_emploi_6_mois);
  const tauxPoursuiteEtudes = num(d.taux_poursuite_etudes);
  if (tauxEmploi6Mois === null && tauxPoursuiteEtudes === null) return null;
  return { annee: row.annee, tauxEmploi6Mois, vaEmploi6Mois: num(d.va_emploi_6_mois), tauxPoursuiteEtudes };
}

/** Langues proposées, par enseignement (LV1, LV2, LCA), triées. */
export function languesOf(rows: SchoolDataRow[]): NearbySchool["langues"] {
  const out = { lv1: new Set<string>(), lv2: new Set<string>(), lca: new Set<string>() };
  for (const r of rows) {
    const langue = typeof r.data.langues === "string" ? r.data.langues.trim() : "";
    const key = String(r.data.enseignements ?? "").toLowerCase();
    if (langue && (key === "lv1" || key === "lv2" || key === "lca")) out[key].add(langue);
  }
  const sorted = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b, "fr"));
  return { lv1: sorted(out.lv1), lv2: sorted(out.lv2), lca: sorted(out.lca) };
}
