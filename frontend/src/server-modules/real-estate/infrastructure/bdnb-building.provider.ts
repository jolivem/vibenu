import type { BuildingInfoProvider } from "./real-estate.provider";
import { BUILDING_PERIODS, type BuildingInfo, type BuildingPeriodCode } from "../domain/real-estate.types";
import { query } from "../../../server-shared/infrastructure/database/postgres";

interface BdnbRow {
  parcelle_id: string;
  usage: string | null;
  nb_logements: number | null;
  nb_niveaux: number | null;
  annee_ffo: number | null;
  periode_rnc: string | null;
  adresse: string | null;
}

/** L'année des Fichiers fonciers, ramenée au découpage du registre des copropriétés. */
export function periodOfYear(year: number): BuildingPeriodCode {
  if (year < 1949) return "AVANT_1949";
  if (year <= 1960) return "DE_1949_A_1960";
  if (year <= 1974) return "DE_1961_A_1974";
  if (year <= 1993) return "DE_1975_A_1993";
  if (year <= 2000) return "DE_1994_A_2000";
  if (year <= 2010) return "DE_2001_A_2010";
  return "APRES_2011";
}

function isPeriod(code: string | null): code is BuildingPeriodCode {
  return code !== null && (BUILDING_PERIODS as readonly string[]).includes(code);
}

/**
 * Fiche des immeubles vendus, lue dans `bdnb_parcelle` (BDNB open, importée par
 * scripts/import_bdnb.py).
 *
 * La période vient d'abord du Registre national des copropriétés : l'année des Fichiers
 * fonciers est parfois celle d'une reconstruction ou d'une erreur (2021 au 2-4 rue
 * Sainte-Lucie, Paris 15e, immeuble que le registre date de 1961-1974).
 *
 * Ne lève jamais : sans table ou sans base, les immeubles s'affichent sans fiche.
 */
export class PostgisBuildingInfoProvider implements BuildingInfoProvider {
  async getBuildings(parcelIds: string[]): Promise<Map<string, BuildingInfo>> {
    const result = new Map<string, BuildingInfo>();
    if (parcelIds.length === 0) return result;
    try {
      const rows = await query<BdnbRow>(
        `SELECT parcelle_id, usage, nb_logements, nb_niveaux, annee_ffo, periode_rnc, adresse
           FROM bdnb_parcelle
          WHERE parcelle_id = ANY($1)`,
        [parcelIds],
      );
      for (const row of rows) {
        const fromRegister = isPeriod(row.periode_rnc);
        const periodCode = fromRegister
          ? (row.periode_rnc as BuildingPeriodCode)
          : row.annee_ffo
            ? periodOfYear(row.annee_ffo)
            : null;
        result.set(row.parcelle_id, {
          usage: row.usage,
          dwellings: row.nb_logements,
          floors: row.nb_niveaux,
          periodCode,
          periodSource: fromRegister ? "rnc" : periodCode ? "fichiers-fonciers" : null,
          address: row.adresse,
        });
      }
    } catch (error) {
      console.warn("BDNB (immeubles importés) :", error);
    }
    return result;
  }
}
