import { DPE_CLASSES, type DpeClass, type DpeDistribution } from "../domain/energy.types";
import { emptyCounts, type DpePoint, type EnergyProvider } from "./energy.provider";

/**
 * API data-fair de l'ADEME, jeu « DPE Logements existants (depuis juillet 2021) »,
 * Licence Ouverte 2.0. Interrogée en direct, sans import : 16 millions de lignes mises à
 * jour chaque semaine, et des réponses sous la seconde.
 *
 * Les DPE remplacés par un plus récent sont déjà retirés de la base par l'ADEME (vérifié
 * le 27/10/2026 sur un échantillon parisien) : aucun filtre à prévoir.
 */
const BASE = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant";

/**
 * Les DPE d'immeuble entier (« dpe immeuble collectif ») ne décrivent pas un logement : ils
 * doublonneraient les DPE d'appartements générés à partir d'eux.
 */
const LOGEMENTS = "NOT type_batiment:immeuble";

/** Plafond de l'API par page ; une adresse compte au plus quelques centaines de DPE. */
const MAX_LINES = 1_000;
const TIMEOUT_MS = 8_000;

interface LinesResponse {
  total: number;
  results: Array<{
    numero_dpe?: string;
    date_etablissement_dpe?: string;
    etiquette_dpe?: string;
    etiquette_ges?: string;
    surface_habitable_logement?: number;
    conso_5_usages_par_m2_ep?: number;
    periode_construction?: string;
    complement_adresse_logement?: string;
    identifiant_ban?: string;
    _geopoint?: string;
  }>;
}

const LINE_FIELDS = [
  "numero_dpe",
  "date_etablissement_dpe",
  "etiquette_dpe",
  "etiquette_ges",
  "surface_habitable_logement",
  "conso_5_usages_par_m2_ep",
  "periode_construction",
  "complement_adresse_logement",
  "identifiant_ban",
  "_geopoint",
].join(",");

const numberOrNull = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);

interface ValuesAggResponse {
  total: number;
  aggs: Array<{ value: string; total: number }>;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
  return (await response.json()) as T;
}

function isDpeClass(value: string): value is DpeClass {
  return (DPE_CLASSES as readonly string[]).includes(value);
}

function toDistribution(response: ValuesAggResponse): DpeDistribution {
  const counts = emptyCounts();
  for (const agg of response.aggs) {
    if (isDpeClass(agg.value)) counts[agg.value] = agg.total;
  }
  return { total: DPE_CLASSES.reduce((sum, c) => sum + counts[c], 0), counts };
}

export class AdemeDpeProvider implements EnergyProvider {
  async getPointsAt(lat: number, lon: number, radiusMeters: number): Promise<DpePoint[]> {
    const params = new URLSearchParams({
      geo_distance: `${lon},${lat},${radiusMeters}`,
      qs: LOGEMENTS,
      select: LINE_FIELDS,
      size: String(MAX_LINES),
    });
    const response = await getJson<LinesResponse>(`${BASE}/lines?${params}`);
    if (response.total > MAX_LINES) {
      console.warn(`AdemeDpeProvider: ${response.total} DPE au point, ${MAX_LINES} lus`);
    }
    return response.results.flatMap((r) => {
      const [latText, lonText] = (r._geopoint ?? "").split(",");
      const pLat = Number(latText);
      const pLon = Number(lonText);
      if (!r.etiquette_dpe || !r.numero_dpe || !r.date_etablissement_dpe) return [];
      if (!Number.isFinite(pLat) || !Number.isFinite(pLon)) return [];
      return [{
        numero: r.numero_dpe,
        date: r.date_etablissement_dpe.slice(0, 10),
        etiquette: r.etiquette_dpe,
        ges: r.etiquette_ges ?? null,
        surface: numberOrNull(r.surface_habitable_logement),
        consoM2: numberOrNull(r.conso_5_usages_par_m2_ep),
        periodeConstruction: r.periode_construction?.trim() || null,
        complement: r.complement_adresse_logement?.trim() || null,
        identifiantBan: r.identifiant_ban ?? null,
        lat: pLat,
        lon: pLon,
      }];
    });
  }

  async getCommuneDistribution(codeCommune: string): Promise<DpeDistribution> {
    const params = new URLSearchParams({
      field: "etiquette_dpe",
      size: "0",
      qs: `code_insee_ban:"${codeCommune}" AND ${LOGEMENTS}`,
    });
    return toDistribution(await getJson<ValuesAggResponse>(`${BASE}/values_agg?${params}`));
  }

  async getFranceDistribution(): Promise<{ distribution: DpeDistribution; miseAJour: string | null }> {
    const params = new URLSearchParams({ field: "etiquette_dpe", size: "0", qs: LOGEMENTS });
    const [aggs, meta] = await Promise.all([
      getJson<ValuesAggResponse>(`${BASE}/values_agg?${params}`),
      getJson<{ dataUpdatedAt?: string }>(`${BASE}?select=dataUpdatedAt`).catch(() => ({ dataUpdatedAt: undefined })),
    ]);
    return {
      distribution: toDistribution(aggs),
      miseAJour: meta.dataUpdatedAt ? meta.dataUpdatedAt.slice(0, 10) : null,
    };
  }
}
