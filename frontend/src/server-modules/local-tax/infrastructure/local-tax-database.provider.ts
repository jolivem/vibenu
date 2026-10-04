import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import { communeMere, departementOf } from "../../../server-shared/domain/commune-code";
import {
  LOCAL_FINANCE_KEYS,
  type LocalFinanceKey,
  type LocalTaxAnalysis,
  type LocalTaxFinances,
  type LocalTaxPropertyTax,
  type LocalTaxSecondHomes,
} from "../domain/local-tax.types";
import { dmtoOf } from "./dmto-rates";
import type { LocalTaxProvider } from "./local-tax.provider";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/** En dessous, la médiane départementale n'est pas un repère : Paris est seule dans le 75. */
const MIN_COMMUNES_REPERE = 5;

/** Nombre d'exercices de comptes affichés, pour lire une évolution. */
const FINANCES_EXERCICES = 5;

interface CommuneRow {
  annee: number;
  taux_tfb_global: string | null;
  taux_tfb_commune: string | null;
  taux_tfb_epci: string | null;
  taux_teom: string | null;
  taux_th: string | null;
  majoration_rs: boolean | null;
  taux_majoration_rs: string | null;
  nom_epci: string | null;
}

interface ReferenceRow {
  code: string;
  annee: number;
  taux_tfb_mediane: string | null;
  taux_teom_mediane: string | null;
  nb_communes_teom: number;
  taux_th_mediane: string | null;
  nb_communes: number;
}

interface DeliberationReferenceRow {
  code: string;
  nb_communes: number;
  nb_tlv: number;
  nb_majoration: number;
  taux_majoration_mediane: string | null;
}

interface DeliberationRow {
  annee: number;
  tlv: boolean | null;
  taux_majoration_rs: string | null;
}

type FinancesRow = { annee: number } & Record<`${LocalFinanceKey}_hab` | `${LocalFinanceKey}_strate`, string | null>;

const num = (v: string | null | undefined): number | null => (v === null || v === undefined ? null : Number(v));

export class LocalTaxDatabaseProvider implements LocalTaxProvider {
  private static cache = new InMemoryCache<LocalTaxAnalysis | null>(SEVEN_DAYS);

  async getLocalTax(codeInsee: string): Promise<LocalTaxAnalysis | null> {
    const cached = LocalTaxDatabaseProvider.cache.get(codeInsee);
    if (cached !== undefined) return cached;

    const { code, villeEntiere } = communeMere(codeInsee);
    const codeDepartement = departementOf(code);

    // Chaque lecture échoue seule : une table absente ne doit pas éteindre les autres blocs.
    let failed = false;
    const safely = async <T>(label: string, read: () => Promise<T[]>): Promise<T[]> => {
      try {
        return await read();
      } catch (error) {
        failed = true;
        console.warn(`LocalTaxDatabaseProvider error (${label}):`, error);
        return [];
      }
    };

    const [communeRows, referenceRows, deliberationRows, deliberationReferenceRows, financesRows] = await Promise.all([
      safely("taux", () =>
        query<CommuneRow>(
          `SELECT annee, taux_tfb_global, taux_tfb_commune, taux_tfb_epci, taux_teom, taux_th,
                  majoration_rs, taux_majoration_rs, nom_epci
             FROM local_tax_commune
            WHERE code_commune = $1
            ORDER BY annee`,
          [code],
        ),
      ),
      safely("repères", () =>
        query<ReferenceRow>(
          `SELECT code, annee, taux_tfb_mediane, taux_teom_mediane, nb_communes_teom, taux_th_mediane, nb_communes
             FROM local_tax_reference
            WHERE code = ANY($1)`,
          [[codeDepartement, "FRANCE"]],
        ),
      ),
      safely("délibérations", () =>
        query<DeliberationRow>(
          `SELECT annee, tlv, taux_majoration_rs
             FROM local_tax_deliberation
            WHERE code_commune = $1
            ORDER BY annee DESC
            LIMIT 1`,
          [code],
        ),
      ),
      // Repères du même millésime que la délibération lue : le plus récent.
      safely("repères des délibérations", () =>
        query<DeliberationReferenceRow>(
          `SELECT code, nb_communes, nb_tlv, nb_majoration, taux_majoration_mediane
             FROM local_tax_deliberation_reference
            WHERE code = ANY($1)
              AND annee = (SELECT MAX(annee) FROM local_tax_deliberation_reference)`,
          [[codeDepartement, "FRANCE"]],
        ),
      ),
      safely("comptes", () =>
        query<FinancesRow>(
          `SELECT annee, dette_hab, dette_strate, impots_hab, impots_strate,
                  equipement_hab, equipement_strate, caf_hab, caf_strate
             FROM local_tax_finances
            WHERE code_commune = $1
            ORDER BY annee DESC
            LIMIT ${FINANCES_EXERCICES}`,
          [code],
        ),
      ),
    ]);

    const analysis: LocalTaxAnalysis = {
      codeCommune: code,
      villeEntiere,
      codeDepartement,
      taxeFonciere: buildPropertyTax(communeRows, referenceRows, codeDepartement),
      residencesSecondaires: buildSecondHomes(
        communeRows.at(-1),
        deliberationRows[0],
        referenceRows,
        deliberationReferenceRows,
        codeDepartement,
      ),
      dmto: dmtoOf(codeDepartement),
      finances: buildFinances(financesRows),
    };

    const empty =
      !analysis.taxeFonciere && !analysis.residencesSecondaires && !analysis.dmto && !analysis.finances;
    const result = empty ? null : analysis;

    // Un résultat amputé par une erreur n'est pas mémorisé : la prochaine requête réessaie.
    if (!failed) LocalTaxDatabaseProvider.cache.set(codeInsee, result);
    return result;
  }
}

function buildPropertyTax(
  rows: CommuneRow[],
  references: ReferenceRow[],
  codeDepartement: string,
): LocalTaxPropertyTax | null {
  const withRate = rows.filter((r) => r.taux_tfb_global !== null);
  const last = withRate.at(-1);
  if (!last) return null;

  const annees = withRate.map((r) => Number(r.annee));
  const reference = (code: string, annee: number) =>
    references.find((r) => r.code === code && Number(r.annee) === annee);

  const medianeDepartement = annees.map((annee) => {
    const ref = reference(codeDepartement, annee);
    return ref && ref.nb_communes >= MIN_COMMUNES_REPERE ? num(ref.taux_tfb_mediane) : null;
  });

  const global = Number(last.taux_tfb_global);
  const commune = num(last.taux_tfb_commune);
  const intercommunalite = num(last.taux_tfb_epci);
  // Reste du taux global : syndicats et taxes spéciales, sans dépendre du détail des colonnes.
  const autres =
    commune === null || intercommunalite === null
      ? null
      : Math.max(0, Math.round((global - commune - intercommunalite) * 100) / 100);

  const teom = num(last.taux_teom);
  const lastAnnee = Number(last.annee);

  return {
    annees,
    tauxGlobal: withRate.map((r) => num(r.taux_tfb_global)),
    medianeDepartement,
    medianeFrance: annees.map((annee) => num(reference("FRANCE", annee)?.taux_tfb_mediane)),
    decomposition: { commune, intercommunalite, autres },
    nomEpci: last.nom_epci,
    teom:
      teom === null
        ? null
        : {
            taux: teom,
            medianeFrance: num(reference("FRANCE", lastAnnee)?.taux_teom_mediane),
            medianeDepartement: teomDepartement(reference(codeDepartement, lastAnnee)),
          },
  };
}

/** Médiane départementale de la TEOM, si assez de communes du département en prélèvent une. */
function teomDepartement(ref: ReferenceRow | undefined): number | null {
  return ref && ref.nb_communes_teom >= MIN_COMMUNES_REPERE ? num(ref.taux_teom_mediane) : null;
}

function buildSecondHomes(
  last: CommuneRow | undefined,
  deliberation: DeliberationRow | undefined,
  references: ReferenceRow[],
  deliberationReferences: DeliberationReferenceRow[],
  codeDepartement: string,
): LocalTaxSecondHomes | null {
  const tauxTh = last ? num(last.taux_th) : null;
  const reference = (code: string) =>
    last ? references.find((r) => r.code === code && Number(r.annee) === Number(last.annee)) : undefined;
  const refDepartement = reference(codeDepartement);
  const delibFrance = deliberationReferences.find((r) => r.code === "FRANCE");
  const delibDepartement = deliberationReferences.find((r) => r.code === codeDepartement);

  // Les délibérations sont plus récentes que le fichier des taux : elles priment.
  let majoration: LocalTaxSecondHomes["majoration"] = null;
  if (deliberation) {
    const tauxPct = num(deliberation.taux_majoration_rs);
    majoration = {
      appliquee: tauxPct !== null,
      tauxPct,
      annee: Number(deliberation.annee),
      nbCommunesFrance: delibFrance?.nb_majoration ?? null,
      medianeFrance: num(delibFrance?.taux_majoration_mediane),
    };
  } else if (last && last.majoration_rs !== null) {
    majoration = {
      appliquee: last.majoration_rs,
      tauxPct: last.majoration_rs ? num(last.taux_majoration_rs) : null,
      annee: Number(last.annee),
      // Les repères sont ceux des délibérations : sans elles, pas de comparaison.
      nbCommunesFrance: null,
      medianeFrance: null,
    };
  }

  const tlv =
    deliberation && deliberation.tlv !== null
      ? {
          soumise: deliberation.tlv,
          annee: Number(deliberation.annee),
          france: delibFrance ? { nb: delibFrance.nb_tlv, total: delibFrance.nb_communes } : null,
          departement:
            delibDepartement && delibDepartement.nb_communes >= MIN_COMMUNES_REPERE
              ? { nb: delibDepartement.nb_tlv, total: delibDepartement.nb_communes }
              : null,
        }
      : null;

  if (tauxTh === null && !majoration && !tlv) return null;
  return {
    tauxTh:
      tauxTh !== null && last
        ? {
            taux: tauxTh,
            annee: Number(last.annee),
            medianeFrance: num(reference("FRANCE")?.taux_th_mediane),
            medianeDepartement:
              refDepartement && refDepartement.nb_communes >= MIN_COMMUNES_REPERE
                ? num(refDepartement.taux_th_mediane)
                : null,
          }
        : null,
    majoration,
    tlv,
  };
}

function buildFinances(rowsDesc: FinancesRow[]): LocalTaxFinances | null {
  if (rowsDesc.length === 0) return null;
  const rows = [...rowsDesc].reverse();

  const series = LOCAL_FINANCE_KEYS.map((cle) => ({
    cle,
    parHabitant: rows.map((row) => num(row[`${cle}_hab`])),
    strate: rows.map((row) => num(row[`${cle}_strate`])),
  })).filter((s) => s.parHabitant.some((v) => v !== null));
  if (series.length === 0) return null;

  // Une commune seule dans sa strate (Paris) a pour « moyenne » ses propres chiffres.
  const strateComparable = series.some((s) =>
    s.strate.some((moyenne, i) => moyenne !== null && moyenne !== s.parHabitant[i]),
  );

  return {
    annees: rows.map((row) => Number(row.annee)),
    strateComparable,
    indicateurs: series.map(({ cle, parHabitant, strate }) => ({
      cle,
      parHabitant,
      moyenneStrate: strateComparable ? strate : strate.map(() => null),
    })),
  };
}
