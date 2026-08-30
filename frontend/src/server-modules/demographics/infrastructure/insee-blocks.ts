import type {
  EmploymentStats,
  HouseholdsStats,
  HousingStats,
} from "../domain/insee-profile.types";

/**
 * Conversion d'un bloc de colonnes INSEE en indicateurs affichables.
 *
 * La requête renvoie chaque échelle — quartier, commune, France — sous la même forme :
 * un objet `jsonb` dont les clés sont les colonnes SQL. Les trois passent donc par les
 * mêmes fonctions ci-dessous, et c'est le point : un pourcentage de quartier et son
 * repère national ne peuvent pas être calculés différemment, puisqu'il n'existe qu'un
 * seul chemin de code. C'est la même garantie que donnait déjà `buildAgeDistribution`.
 *
 * La base ne stocke que des effectifs. Tous les rapports sont pris ici.
 */

/** Un bloc `to_jsonb` : colonnes SQL en snake_case. `null` = pas de ligne appariée. */
export type InseeBlock = Record<string, number | string | null> | null;

function num(block: InseeBlock, key: string): number | null {
  const v = block?.[key];
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Part en %, au dixième. `null` dès que le numérateur ou le dénominateur manque. */
function pct(block: InseeBlock, numKey: string, denKey: string): number | null {
  const n = num(block, numKey);
  const d = num(block, denKey);
  if (n === null || !d) return null;
  return Math.round((n / d) * 1000) / 10;
}

/** Une distribution : la même part, prise sur plusieurs colonnes du même dénominateur. */
function distribution(
  block: InseeBlock,
  keys: readonly string[],
  denKey: string,
): (number | null)[] | null {
  if (!num(block, denKey)) return null;
  const values = keys.map((k) => pct(block, k, denKey));
  return values.some((v) => v !== null) ? values : null;
}

export function buildHousingStats(block: InseeBlock): HousingStats | null {
  const rp = num(block, "rp");
  const log = num(block, "log");
  if (!rp && !log) return null;

  // RP_LOCHLMV est un sous-ensemble de RP_LOC (« dont HLM loué vide »). Sans cette
  // soustraction, les quatre parts du statut d'occupation dépassent 100 % — d'un
  // écart assez petit pour passer inaperçu longtemps.
  const loc = num(block, "rp_loc");
  const hlm = num(block, "rp_lochlmv");
  const locPrives = loc === null ? null : loc - (hlm ?? 0);

  return {
    logements: log,
    residencesPrincipales: rp,
    pctProprietaires: pct(block, "rp_prop", "rp"),
    pctLocatairesPrives: locPrives === null || !rp ? null : Math.round((locPrives / rp) * 1000) / 10,
    pctHlm: pct(block, "rp_lochlmv", "rp"),
    pctLogesGratuitement: pct(block, "rp_grat", "rp"),
    pctVacants: pct(block, "logvac", "log"),
    pctResidencesSecondaires: pct(block, "rsecocc", "log"),
    pctMaisons: pct(block, "maison", "log"),
    pctAppartements: pct(block, "appart", "log"),
    pieces: distribution(block, ["rp_1p", "rp_2p", "rp_3p", "rp_4p", "rp_5pp"], "rp"),
    // Dénominateur `rp_achtot`, pas `rp` : les tranches ne couvrent que les
    // résidences principales construites avant 2019.
    epoques: distribution(
      block,
      ["rp_ach19", "rp_ach45", "rp_ach70", "rp_ach90", "rp_ach05", "rp_ach18"],
      "rp_achtot",
    ),
  };
}

export function buildEmploymentStats(block: InseeBlock): EmploymentStats | null {
  const actifs = num(block, "actifs_15_64");
  const nscol = num(block, "nscol_15p");
  if (!actifs && !nscol) return null;

  const sup2 = num(block, "nscol_sup2");
  const sup34 = num(block, "nscol_sup34");
  const sup5 = num(block, "nscol_sup5");
  const sup =
    sup2 === null && sup34 === null && sup5 === null
      ? null
      : (sup2 ?? 0) + (sup34 ?? 0) + (sup5 ?? 0);

  return {
    tauxChomage: pct(block, "chomeurs_15_64", "actifs_15_64"),
    tauxActivite: pct(block, "actifs_15_64", "pop_15_64"),
    csp: distribution(block, ["cs1", "cs2", "cs3", "cs4", "cs5", "cs6"], "actifs_occ_15_64"),
    pctDiplomesSuperieur: sup === null || !nscol ? null : Math.round((sup / nscol) * 1000) / 10,
    diplomes: distribution(
      block,
      ["nscol_diplmin", "nscol_bepc", "nscol_capbep", "nscol_bac", "nscol_sup2", "nscol_sup34", "nscol_sup5"],
      "nscol_15p",
    ),
  };
}

export function buildHouseholdsStats(block: InseeBlock): HouseholdsStats | null {
  const men = num(block, "men");
  if (!men) return null;
  const pmen = num(block, "pmen");

  return {
    nombreMenages: men,
    tailleMoyenne: pmen === null ? null : Math.round((pmen / men) * 100) / 100,
    pctPersonnesSeules: pct(block, "men_pseul", "men"),
    pctCouplesSansEnfant: pct(block, "men_coup_senf", "men"),
    pctCouplesAvecEnfants: pct(block, "men_coup_aenf", "men"),
    pctFamillesMonoparentales: pct(block, "men_fammono", "men"),
    pctAutresMenages: pct(block, "men_sfam", "men"),
    enfantsParFamille: distribution(
      block,
      ["ne24f0", "ne24f1", "ne24f2", "ne24f3", "ne24f4p"],
      "fam",
    ),
  };
}

export { num as blockNumber };
