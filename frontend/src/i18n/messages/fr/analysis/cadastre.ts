import { createFormat } from "../../../format";
import type { Rich } from "../../../types";

const f = createFormat("fr");

/** Types de zone du standard CNIG. `AUc` et `AUs` sont distincts, voir `pluZone.ts`. */
export type PluZoneKey = "U" | "AUc" | "AUs" | "A" | "N";

/**
 * Card « Cadastre & urbanisme ». Le libellé long du secteur et les prescriptions sont le
 * texte du PLU de la commune : ils viennent des données et restent en français.
 */
export const cadastre = {
  title: "Cadastre & urbanisme",
  parcelTitle: "Parcelle",
  /** Hectares au-delà de 10 000 m² ; `toFixed`, comme affiché jusqu'ici. */
  surface: (m2: number) => (m2 >= 10_000 ? `${(m2 / 10_000).toFixed(2)} ha` : `${f.spaced(m2)} m²`),
  parcelReference: (section: string, numero: string) => `Section ${section} · n° ${numero}`,
  zoneTitle: "Zone PLU",
  /**
   * Nom court (pastille) et glose de chaque type : ce que le code de l'urbanisme dit de
   * la zone, en une proposition.
   */
  zoneTypes: {
    U: {
      label: "Urbain",
      gloss:
        "secteur déjà urbanisé, ou dont les équipements suffisent à desservir de nouvelles constructions",
    },
    AUc: {
      label: "À urbaniser",
      gloss:
        "destiné à être urbanisé, les équipements en périphérie immédiate ayant une capacité suffisante",
    },
    AUs: {
      label: "À urbaniser à terme",
      gloss:
        "destiné à être urbanisé, mais son ouverture suppose d'abord une modification ou une révision du PLU",
    },
    A: {
      label: "Agricole",
      gloss: "terres protégées en raison de leur potentiel agronomique, biologique ou économique",
    },
    N: {
      label: "Naturel",
      gloss:
        "espaces naturels ou forestiers protégés — qualité des sites, ressources naturelles, ou prévention des risques",
    },
  } satisfies Record<PluZoneKey, { label: string; gloss: string }>,
  zoneGloss: (label: string, gloss: string, code: string): Rich => [
    { strong: label },
    ` : ${gloss}. Seule cette catégorie est nationale — le détail du secteur «\u00a0${code}\u00a0» est fixé par le règlement du PLU de la commune.`,
  ],
  prescriptionsTitle: "Prescriptions d'urbanisme",
  /**
   * Mention affichée quand la page n'est pas en français : le libellé du secteur et les
   * prescriptions sont le texte du PLU, cité tel quel. `null` en français.
   */
  sourceLanguageNote: null as string | null,
};

export type CadastreMessages = typeof cadastre;
