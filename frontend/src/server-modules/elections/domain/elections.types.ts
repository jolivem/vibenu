export interface CandidateResult {
  candidat: string;
  parti: string;
  panneau: number;
  pctCommune: number;
  pctNational: number;
}

export interface ElectionsAnalysis {
  scrutin: "presidentielle-2022-t1";
  inscrits: number;
  votants: number;
  exprimes: number;
  participationPct: number;
  nationalParticipationPct: number;
  candidates: CandidateResult[];
}
