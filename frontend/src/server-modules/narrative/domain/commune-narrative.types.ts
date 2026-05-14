import type { CommuneStats } from "../../commune-stats/domain/commune-stats.types";

export interface CommuneNarrativeInput {
  codeCommune: string;
  nomAffiche: string;
  stats: CommuneStats;
}

export interface CommuneNarrativeContent {
  identite: string;
  marche_immobilier: string;
  cadre_de_vie: string;
  profil: string;
}

export interface CommuneNarrativeResult {
  content: CommuneNarrativeContent;
  model: string;
  generatedAt: string; // ISO
  fromCache: boolean;
}
