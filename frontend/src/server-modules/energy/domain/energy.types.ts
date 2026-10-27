/**
 * Diagnostics de performance énergétique (DPE) — base « DPE Logements existants (depuis
 * juillet 2021) » de l'ADEME.
 *
 * Ce sont des DPE **réalisés**, pas un inventaire des logements : on n'en fait qu'à la vente
 * ou à la location. Un DPE porte sur un logement, jamais sur l'immeuble.
 *
 * Les DPE de l'adresse analysée sont détaillés un par un (l'ADEME les publie avec leur
 * adresse), mais sans étage, porte ni complément d'adresse : la surface suffit à l'acheteur
 * pour retrouver son logement, et c'est ce qui rapprocherait le plus d'un foyer précis.
 */

export const DPE_CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type DpeClass = (typeof DPE_CLASSES)[number];

export type DpeCounts = Record<DpeClass, number>;

export interface DpeDistribution {
  total: number;
  counts: DpeCounts;
}

/** Un DPE de l'adresse, tel qu'affiché. */
export interface DpeRecord {
  /** Numéro ADEME (13 caractères), vérifiable sur l'observatoire DPE-Audit. */
  numero: string;
  /** Date d'établissement, ISO. */
  date: string;
  energie: DpeClass;
  ges: DpeClass | null;
  surface: number | null;
  /** Consommation d'énergie primaire, kWh/m²/an, cinq usages. */
  consoM2: number | null;
  /** Texte de la source (« avant 1948 », « 1948-1974 »…), en français. */
  periodeConstruction: string | null;
  /** DPE plus anciens du même logement, écartés au profit de celui-ci. */
  anterieurs: number;
}

export interface EnergyAnalysis {
  /**
   * À l'adresse même (mode adresse, numéro de rue) : un DPE par logement, le plus récent,
   * du plus récent au plus ancien. Les comptes portent sur ces DPE-là.
   */
  adresse: { total: number; counts: DpeCounts; diagnostics: DpeRecord[] } | null;
  codeCommune: string | null;
  commune: DpeDistribution | null;
  france: DpeDistribution | null;
  /** Dernière mise à jour des données chez l'ADEME, ISO. */
  miseAJour: string | null;
}
