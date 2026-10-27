import type {
  DpeRecordDto,
  DpeClassDto,
  DpeCountsDto,
  DpeDistributionDto,
  EnergyAnalysisDto,
} from "@/types/location-analysis";

/** Ordre de l'étiquette, de la meilleure à la pire. */
export const DPE_CLASSES: readonly DpeClassDto[] = ["A", "B", "C", "D", "E", "F", "G"];

/** Couleurs de l'étiquette énergie du DPE, du vert au rouge. */
export const DPE_COLORS: Record<DpeClassDto, string> = {
  A: "#00A06D",
  B: "#52B153",
  C: "#A5CC74",
  D: "#F4E70F",
  E: "#F0B40F",
  F: "#EB8235",
  G: "#D7221F",
};

/** Lettre sombre sur les fonds clairs (C, D, E), blanche ailleurs. */
export const DPE_TEXT_COLORS: Record<DpeClassDto, string> = {
  A: "#fff",
  B: "#fff",
  C: "#1A1A1A",
  D: "#1A1A1A",
  E: "#1A1A1A",
  F: "#fff",
  G: "#fff",
};

export function hasEnergyContent(energy: EnergyAnalysisDto | null | undefined): energy is EnergyAnalysisDto {
  return Boolean(energy && (energy.commune || energy.france || (energy.adresse && energy.adresse.total > 0)));
}

/** Part de chaque étiquette, en %, sans arrondi. */
export function dpeShares(counts: DpeCountsDto, total: number): Record<DpeClassDto, number> {
  const shares = {} as Record<DpeClassDto, number>;
  for (const c of DPE_CLASSES) shares[c] = total > 0 ? (counts[c] / total) * 100 : 0;
  return shares;
}

/** Part des DPE classés F ou G (« passoires thermiques »), en %. */
export function poorShare(d: DpeDistributionDto): number {
  return d.total > 0 ? ((d.counts.F + d.counts.G) / d.total) * 100 : 0;
}

/**
 * Calendrier d'interdiction de louer (loi Climat et résilience, art. L. 173-1-1 du code de
 * la construction), vérifié sur service-public.gouv.fr le 27/10/2026 : en métropole G depuis
 * 2025, F en 2028, E en 2034 ; outre-mer F et G en 2028. Un projet de loi d'assouplissement
 * était en discussion à cette date : à revérifier s'il est voté.
 */
export interface RentalBanStep {
  year: number;
  /** Classes qui s'ajoutent cette année-là à celles déjà exclues de la location. */
  classes: DpeClassDto[];
  /** L'étape est déjà en vigueur (« depuis » plutôt que « à partir de »). */
  past: boolean;
}

export function rentalBanCalendar(
  codeCommune: string | null,
  today: Date = new Date(),
): { overseas: boolean; steps: RentalBanStep[] } {
  const overseas = Boolean(codeCommune?.startsWith("97"));
  const steps: Array<Omit<RentalBanStep, "past">> = overseas
    ? [{ year: 2028, classes: ["F", "G"] }]
    : [
        { year: 2025, classes: ["G"] },
        { year: 2028, classes: ["F"] },
        { year: 2034, classes: ["E"] },
      ];
  // Chaque étape vaut au 1er janvier de son année.
  return { overseas, steps: steps.map((s) => ({ ...s, past: today.getFullYear() >= s.year })) };
}

/**
 * Page d'un DPE sur l'observatoire DPE-Audit de l'ADEME, par son numéro : de quoi comparer le
 * diagnostic remis par le vendeur ou le bailleur avec celui enregistré.
 */
export function dpeVerifyUrl(numero: string): string {
  return `https://observatoire-dpe-audit.ademe.fr/afficher-dpe/${encodeURIComponent(numero)}`;
}

/**
 * Liste des DPE de l'adresse : entière jusqu'à `DPE_LIST_MAX_FULL` lignes ; au-delà (un grand
 * immeuble en compte des centaines), les `DPE_LIST_VISIBLE` premières, le reste replié. Replier
 * une ou deux lignes n'aurait pas de sens.
 */
export const DPE_LIST_MAX_FULL = 20;
export const DPE_LIST_VISIBLE = 12;

/**
 * Période de construction de l'adresse : celle que donne le plus grand nombre de ses DPE.
 * Chaque diagnostiqueur la saisit ; une valeur isolée (« 1948-1974 » parmi vingt « avant
 * 1948 ») est une erreur de saisie plus qu'une information. `null` si aucun DPE ne la donne.
 */
export function dominantBuildPeriod(diagnostics: DpeRecordDto[]): string | null {
  const counts = new Map<string, number>();
  for (const d of diagnostics) {
    if (d.periodeConstruction) counts.set(d.periodeConstruction, (counts.get(d.periodeConstruction) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [period, n] of counts) {
    if (n > bestCount) {
      best = period;
      bestCount = n;
    }
  }
  return best;
}
