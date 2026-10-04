import { createFormat } from "../../../format";

const f = createFormat("fr");

/** `toFixed`, comme les scores publiés jusqu'ici : voir `Format.fixed`. */
const pct = (value: number) => `${f.fixed(value, 1)} %`;

/**
 * Cards « Municipales 2026 » et « Présidentielle 2022 ». Les textes décrivent l'écart au
 * national, jamais l'électeur. Les noms de listes, de têtes de liste et de candidats sont
 * des noms propres : ils viennent des données et ne se traduisent pas.
 */
export const elections = {
  pct,
  /** Pastille d'écart au score national, en points. */
  delta: (delta: number) => {
    const rounded = Math.round(delta * 10) / 10;
    if (rounded === 0) return "= national";
    return `${rounded > 0 ? "+" : "−"}${f.fixed(Math.abs(rounded), 1)} pts`;
  },
  communeBar: "Commune",
  franceBar: "France",
  /** Nuances politiques attribuées par le ministère de l'Intérieur aux listes municipales. */
  nuances: {
    LEXG: "Extrême gauche",
    LFI: "La France insoumise",
    LCOM: "Communiste",
    LSOC: "Socialiste",
    LUG: "Union de la gauche",
    LVEC: "Écologiste",
    LDVG: "Divers gauche",
    LDIV: "Divers",
    LREG: "Régionaliste",
    LDVC: "Divers centre",
    LENS: "Ensemble",
    LMDM: "Modem",
    LUDI: "UDI",
    LLR: "Les Républicains",
    LDVD: "Divers droite",
    LUD: "Union de la droite",
    LRN: "Rassemblement national",
    LEXD: "Extrême droite",
    LUXD: "Union extrême droite",
  } as Record<string, string>,
  noNuance: "Sans étiquette",
  /** Partis des candidats à la présidentielle 2022. */
  parties: {
    LO: "Lutte ouvrière",
    PCF: "Parti communiste français",
    LFI: "La France insoumise",
    PS: "Parti socialiste",
    EELV: "Europe Écologie Les Verts",
    REN: "Renaissance",
    RES: "Résistons",
    DLF: "Debout la France",
    LR: "Les Républicains",
    REC: "Reconquête",
    RN: "Rassemblement national",
    NPA: "Nouveau Parti anticapitaliste",
  } as Record<string, string>,
  presidential: {
    title: "Présidentielle 2022 — 1er tour",
    participation: (local: number, france: number) =>
      `Participation : ${pct(local)} · France : ${pct(france)}`,
    showOthers: (count: number) => `Voir les ${count} autres candidats`,
    hideOthers: "Masquer les autres candidats",
    footnote: "Comparaison commune ↔ France à la même échelle.",
  },
  municipal: {
    title: (round: number) => `Municipales 2026 — ${round === 1 ? "1er" : "2e"} tour`,
    participation: (value: number, singleList: boolean) =>
      `Participation : ${pct(value)}${singleList ? " · Une seule liste était en lice." : ""}`,
    seats: (count: number) => `${count} siège${count > 1 ? "s" : ""}`,
    seatsOnCouncil: (count: number) => `${count} siège${count > 1 ? "s" : ""} au conseil municipal`,
    /** Ligne d'une liste sans nuance : voix, score, sièges éventuels. */
    plainLine: (p: { votes: number; pct: number; seats: number | null }) =>
      `${f.number(p.votes)} voix · ${pct(p.pct)}${
        p.seats !== null ? ` · ${p.seats} siège${p.seats > 1 ? "s" : ""}` : ""
      }`,
    wholeCity:
      "Résultat de la ville entière : le scrutin municipal ne se décline pas par arrondissement.",
    noNuances:
      "Aucune nuance politique n'est publiée pour cette commune : l'État ne l'attribue qu'au-delà d'une certaine taille. Les listes sont donc présentées sans étiquette.",
  },
};

export type ElectionsMessages = typeof elections;
