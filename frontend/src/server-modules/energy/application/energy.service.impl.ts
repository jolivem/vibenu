import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import {
  DPE_CLASSES,
  type DpeClass,
  type DpeCounts,
  type DpeDistribution,
  type DpeRecord,
  type EnergyAnalysis,
} from "../domain/energy.types";
import { emptyCounts, type DpePoint, type EnergyProvider } from "../infrastructure/energy.provider";
import type { EnergyQuery, EnergyService } from "./energy.service";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Distance sous laquelle un DPE est « à l'adresse ». Les DPE sont placés au point BAN de leur
 * adresse, qui est aussi le point de l'analyse : l'écart réel est de l'ordre du millimètre.
 * Surtout pas davantage : le n° 13 de la rue de l'Église (Paris 15e) est à 8,9 m du n° 11, et
 * une marge de 10 m lui prêtait ses DPE quand le 11 n'en avait pas.
 */
const ADDRESS_MATCH_METERS = 2;

const METERS_PER_DEGREE_LAT = 111_320;

export class EnergyServiceImpl implements EnergyService {
  private static addressCache = new InMemoryCache<DpePoint[]>(SEVEN_DAYS);
  private static communeCache = new InMemoryCache<DpeDistribution>(SEVEN_DAYS);
  private static franceCache = new InMemoryCache<{ distribution: DpeDistribution; miseAJour: string | null }>(SEVEN_DAYS);

  constructor(private readonly provider: EnergyProvider) {}

  async getEnergy(query: EnergyQuery): Promise<EnergyAnalysis | null> {
    const { lat, lon, codeCommune, mode, atAddress } = query;
    const [atPoint, commune, france] = await Promise.all([
      mode === "address" && atAddress ? this.atPoint(lat, lon) : Promise.resolve(null),
      codeCommune ? this.commune(codeCommune) : Promise.resolve(null),
      this.france(),
    ]);
    if (!atPoint && !commune && !france) return null;

    return {
      adresse: atPoint ? addressDistribution(atPoint, lat, lon) : null,
      codeCommune: codeCommune ?? null,
      commune,
      france: france?.distribution ?? null,
      miseAJour: france?.miseAJour ?? null,
    };
  }

  /** DPE posés au point même : quelques dizaines de lignes au plus. */
  private async atPoint(lat: number, lon: number): Promise<DpePoint[] | null> {
    const key = buildGeoKey(lat, lon, 6);
    const cached = EnergyServiceImpl.addressCache.get(key);
    if (cached) return cached;
    try {
      const points = await this.provider.getPointsAt(lat, lon, ADDRESS_MATCH_METERS);
      EnergyServiceImpl.addressCache.set(key, points);
      return points;
    } catch (error) {
      console.warn("EnergyService address error:", error);
      return null;
    }
  }

  private async commune(codeCommune: string): Promise<DpeDistribution | null> {
    const cached = EnergyServiceImpl.communeCache.get(codeCommune);
    if (cached) return cached;
    try {
      const distribution = await this.provider.getCommuneDistribution(codeCommune);
      EnergyServiceImpl.communeCache.set(codeCommune, distribution);
      return distribution;
    } catch (error) {
      console.warn("EnergyService commune error:", error);
      return null;
    }
  }

  private async france(): Promise<{ distribution: DpeDistribution; miseAJour: string | null } | null> {
    const cached = EnergyServiceImpl.franceCache.get("FRANCE");
    if (cached) return cached;
    try {
      const france = await this.provider.getFranceDistribution();
      EnergyServiceImpl.franceCache.set("FRANCE", france);
      return france;
    } catch (error) {
      console.warn("EnergyService France error:", error);
      return null;
    }
  }
}

function isDpeClass(value: string): value is DpeClass {
  return (DPE_CLASSES as readonly string[]).includes(value);
}

function countsOf(points: DpePoint[]): DpeCounts {
  const counts = emptyCounts();
  for (const p of points) if (isDpeClass(p.etiquette)) counts[p.etiquette] += 1;
  return counts;
}

function totalOf(counts: DpeCounts): number {
  return DPE_CLASSES.reduce((sum, c) => sum + counts[c], 0);
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dy = (lat2 - lat1) * METERS_PER_DEGREE_LAT;
  const dx = (lon2 - lon1) * METERS_PER_DEGREE_LAT * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/**
 * Un même logement diagnostiqué plusieurs fois : même surface et même complément d'adresse
 * (un appartement de 44,3 m² « Esc. A ; Étage 1 » a trois DPE entre juin et août 2026, que
 * l'ADEME ne marque pas comme remplacés). Le complément est normalisé — casse, ponctuation,
 * espaces — mais pas interprété : deux saisies différentes du même logement restent deux
 * lignes, ce qui vaut mieux que fusionner deux logements distincts.
 */
function dwellingKey(p: DpePoint): string {
  const complement = (p.complement ?? "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  return `${p.surface ?? "?"}|${complement}`;
}

/**
 * Les DPE de l'adresse : ceux de l'identifiant BAN le plus proche du point (deux adresses
 * peuvent partager un point), un par logement — le plus récent —, du plus récent au plus
 * ancien.
 */
function addressDistribution(points: DpePoint[], lat: number, lon: number): EnergyAnalysis["adresse"] {
  let best: { id: string; distance: number } | null = null;
  for (const p of points) {
    if (!p.identifiantBan) continue;
    const distance = distanceMeters(lat, lon, p.lat, p.lon);
    if (!best || distance < best.distance) best = { id: p.identifiantBan, distance };
  }
  if (!best) return { total: 0, counts: emptyCounts(), diagnostics: [] };
  const atAddress = points
    .filter((p) => p.identifiantBan === best.id && isDpeClass(p.etiquette))
    .sort((a, b) => b.date.localeCompare(a.date));

  const byDwelling = new Map<string, { latest: DpePoint; older: number }>();
  for (const p of atAddress) {
    const key = dwellingKey(p);
    const entry = byDwelling.get(key);
    if (entry) entry.older += 1;
    else byDwelling.set(key, { latest: p, older: 0 });
  }
  const latest = [...byDwelling.values()];
  const counts = countsOf(latest.map((e) => e.latest));
  const diagnostics: DpeRecord[] = latest.map(({ latest: p, older }) => ({
    numero: p.numero,
    date: p.date,
    energie: p.etiquette as DpeClass,
    ges: p.ges && isDpeClass(p.ges) ? p.ges : null,
    surface: p.surface,
    consoM2: p.consoM2,
    periodeConstruction: p.periodeConstruction,
    anterieurs: older,
  }));
  return { total: totalOf(counts), counts, diagnostics };
}
