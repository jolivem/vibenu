import type { DpeClassDto } from "@/types/location-analysis";
import type { Rich } from "../../../types";
import { createFormat } from "../../../format";

const f = createFormat("fr");

/** Deux chiffres significatifs : 93 863 → 94 000, 4 771 → 4 800. */
const roughly = (n: number) => {
  const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
};

const dpe = (n: number) => `${f.int(n)} DPE`;
const pct = (v: number) => `${f.int(v)} %`;

/** « G », « F et G », « E, F et G ». */
const classList = (classes: DpeClassDto[]) =>
  classes.length === 1 ? classes[0] : `${classes.slice(0, -1).join(", ")} et ${classes[classes.length - 1]}`;

/** Card « Performance énergétique » : DPE de l'ADEME, à l'adresse, dans la commune et en France. */
export const energy = {
  title: "Performance énergétique (DPE)",
  /** Première des précautions, au pied de la card : ce que sont ces chiffres, et ce qu'ils ne sont pas. */
  intro:
    "Diagnostics réalisés depuis juillet 2021, à l'occasion d'une vente ou d'une location : " +
    "ils ne décrivent pas tous les logements.",
  /** Libellés des barres. */
  rows: {
    address: "À cette adresse",
    commune: "Commune",
    france: "France",
  },
  /** Détail : les DPE de l'adresse, un par logement. */
  list: {
    title: "Les diagnostics de cette adresse",
    intro: (older: number) =>
      "Un diagnostic par logement, le plus récent. Retrouvez le vôtre par sa surface." +
      (older > 0
        ? ` ${older === 1 ? "Un diagnostic plus ancien d'un même logement n'est pas repris" : `${f.int(older)} diagnostics plus anciens d'un même logement ne sont pas repris`}.`
        : ""),
    head: {
      date: "Date",
      surface: "Surface",
      energy: "Classe DPE",
      ghg: "Émissions (GES)",
      conso: "kWh/m²/an",
      number: "N° ADEME",
    },
    date: (iso: string) => f.dateShort(iso),
    surface: (m2: number) => `${f.decimal(m2, 1)} m²`,
    conso: (v: number) => f.int(v),
    /** En tête de liste : la période qu'indique la majorité des DPE, texte de la source. */
    builtLead: "Construction, d'après la plupart des diagnostics : ",
    /** Sous le tableau : ce qu'est la classe DPE. */
    classNote:
      "La classe DPE est la moins bonne des deux notes : consommation d'énergie et émissions de gaz à effet de serre. " +
      "C'est elle qui compte pour la location.",
    /** Infobulle du lien vers l'observatoire de l'ADEME. */
    verifyTitle: "Vérifier ce diagnostic sur l'observatoire DPE de l'ADEME",
    missing: "—",
    /** Liste longue (grand immeuble) : le reste replié. */
    more: (n: number) => `Afficher ${n === 1 ? "l'autre diagnostic" : `les ${f.int(n)} autres diagnostics`}`,
  },
  /** Détail, en mode adresse : les barres de la commune et de la France. */
  compareTitle: "Pour comparer",
  /** Effectif sous le libellé d'une barre. */
  rowCount: (n: number) => `${f.int(n)} ${f.plural(n) === "one" ? "diagnostic" : "diagnostics"}`,
  /** Commune et France : un ordre de grandeur suffit (« environ 94 000 », « 15,4 millions »). */
  rowCountApprox: (n: number) =>
    n >= 1_000_000
      ? `${f.decimal(n / 1_000_000, 1)} millions de diagnostics`
      : n >= 1_000
        ? `environ ${f.int(roughly(n))} diagnostics`
        : `${f.int(n)} ${f.plural(n) === "one" ? "diagnostic" : "diagnostics"}`,
  addressNone: "Aucun diagnostic enregistré à cette adresse depuis juillet 2021.",
  /** Infobulle et description d'une barre. */
  segmentTitle: (cls: DpeClassDto, count: number, share: number) => `${cls} : ${dpe(count)} (${pct(share)})`,
  barSummary: (row: string, parts: string[]) => `${row} : ${parts.join(", ")}`,
  legendLabel: "Classe DPE, de A (sobre) à G (énergivore)",
  /** Calendrier d'interdiction de louer. */
  rentalBanTitle: "Location et DPE",
  /** « … classé G depuis 2025, F à partir de 2028 et E à partir de 2034 (métropole). » */
  rentalBan: (steps: { year: number; classes: DpeClassDto[]; past: boolean }[], overseas: boolean): Rich => [
    "Location interdite (bail signé, renouvelé ou reconduit) pour un logement classé ",
    ...steps.flatMap((s, i) => [
      i === 0 ? "" : i === steps.length - 1 ? " et " : ", ",
      { strong: classList(s.classes) },
      s.past ? ` depuis ${s.year}` : ` à partir de ${s.year}`,
    ]),
    overseas ? " (outre-mer)." : " (métropole).",
  ],
  /** Précautions. */
  caveats: [
    "Un DPE porte sur un logement, pas sur l'immeuble : à une même adresse, les appartements ont des étiquettes différentes.",
    "Depuis le 1er janvier 2026, le calcul est plus favorable au chauffage électrique : un DPE établi avant peut afficher une classe de trop (au plus une).",
  ],
  source: (date: string | null) =>
    `Source : ADEME, DPE des logements existants depuis juillet 2021${date ? `, données au ${f.dateLong(date)}` : ""}.`,
  /** Fiche PDF. */
  pdfLabel: "Performance énergétique",
  /** « À l'adresse : 13 diagnostics — C 1, D 2, E 5, F 5 ». */
  pdfAddress: (total: number, parts: Array<[DpeClassDto, number]>) =>
    `À l'adresse : ${f.int(total)} ${f.plural(total) === "one" ? "diagnostic" : "diagnostics"} — ` +
    parts.map(([c, n]) => `${c} ${f.int(n)}`).join(", "),
  pdfLine: (p: { commune: number | null; france: number | null }) =>
    [
      p.commune !== null && `F ou G : ${pct(p.commune)} dans la commune`,
      p.france !== null && `${pct(p.france)} en France`,
    ]
      .filter(Boolean)
      .join(" · "),
};

export type EnergyMessages = typeof energy;
