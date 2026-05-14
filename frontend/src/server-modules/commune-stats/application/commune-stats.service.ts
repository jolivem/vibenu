import { PostgisCommuneStatsProvider } from "../infrastructure/postgis-commune-stats.provider";
import type { CommuneStats } from "../domain/commune-stats.types";

export interface CommuneStatsService {
  getStats(codeCommune: string): Promise<CommuneStats>;
}

export class CommuneStatsServiceImpl implements CommuneStatsService {
  constructor(private readonly provider = new PostgisCommuneStatsProvider()) {}

  getStats(codeCommune: string): Promise<CommuneStats> {
    return this.provider.getStats(codeCommune);
  }
}

let singleton: CommuneStatsService | null = null;

export function getCommuneStatsService(): CommuneStatsService {
  if (!singleton) {
    singleton = new CommuneStatsServiceImpl();
  }
  return singleton;
}
