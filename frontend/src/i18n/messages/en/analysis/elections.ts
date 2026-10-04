import type { ElectionsMessages } from "../../fr/analysis/elections";
import { createFormat } from "../../../format";

const f = createFormat("en");

const pct = (value: number) => `${f.fixed(value, 1)}%`;
const seats = (count: number) => `${count} seat${count === 1 ? "" : "s"}`;

export const elections: ElectionsMessages = {
  pct,
  delta: (delta) => {
    const rounded = Math.round(delta * 10) / 10;
    if (rounded === 0) return "= national";
    return `${rounded > 0 ? "+" : "−"}${f.fixed(Math.abs(rounded), 1)} pts`;
  },
  communeBar: "Commune",
  franceBar: "France",
  // Political labels assigned by the Interior Ministry to municipal lists.
  nuances: {
    LEXG: "Far left",
    LFI: "La France insoumise",
    LCOM: "Communist",
    LSOC: "Socialist",
    LUG: "United left",
    LVEC: "Green",
    LDVG: "Other left",
    LDIV: "Other",
    LREG: "Regionalist",
    LDVC: "Other centre",
    LENS: "Ensemble",
    LMDM: "MoDem",
    LUDI: "UDI",
    LLR: "Les Républicains",
    LDVD: "Other right",
    LUD: "United right",
    LRN: "Rassemblement national",
    LEXD: "Far right",
    LUXD: "United far right",
  },
  noNuance: "No label",
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
  },
  presidential: {
    title: "2022 presidential election — first round",
    participation: (local, france) => `Turnout: ${pct(local)} · France: ${pct(france)}`,
    showOthers: (count) => `Show the ${count} other candidates`,
    hideOthers: "Hide the other candidates",
    footnote: "Commune ↔ France comparison on the same scale.",
  },
  municipal: {
    title: (round) => `2026 municipal elections — ${round === 1 ? "first" : "second"} round`,
    participation: (value, singleList) =>
      `Turnout: ${pct(value)}${singleList ? " · Only one list was standing." : ""}`,
    seats,
    seatsOnCouncil: (count) => `${seats(count)} on the municipal council`,
    plainLine: (p) =>
      `${f.number(p.votes)} votes · ${pct(p.pct)}${p.seats !== null ? ` · ${seats(p.seats)}` : ""}`,
    wholeCity:
      "Result for the whole city: the municipal election is not broken down by arrondissement.",
    noNuances:
      "No political label is published for this commune: the state only assigns one above a certain size. The lists are therefore shown without a label.",
  },
};
