import type { DpeClassDto } from "@/types/location-analysis";
import type { EnergyMessages } from "../../fr/analysis/energy";
import { createFormat } from "../../../format";

const f = createFormat("en");

const roughly = (n: number) => {
  const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
};

const dpe = (n: number) => `${f.int(n)} EPC${n === 1 ? "" : "s"}`;
const pct = (v: number) => `${f.int(v)}%`;

const classList = (classes: DpeClassDto[]) =>
  classes.length === 1 ? classes[0] : `${classes.slice(0, -1).join(", ")} and ${classes[classes.length - 1]}`;

export const energy: EnergyMessages = {
  title: "Energy performance (DPE)",
  intro:
    "Energy performance certificates (DPE) issued since July 2021 when a home was sold or let: " +
    "they do not describe every dwelling.",
  rows: {
    address: "At this address",
    commune: "Commune",
    france: "France",
  },
  list: {
    title: "Certificates at this address",
    intro: (older) =>
      "One certificate per dwelling, the most recent. Find yours by its floor area." +
      (older > 0
        ? ` ${older === 1 ? "One older certificate for the same dwelling is left out" : `${f.int(older)} older certificates for the same dwelling are left out`}.`
        : ""),
    head: {
      date: "Date",
      surface: "Area",
      energy: "DPE class",
      ghg: "Emissions (GHG)",
      conso: "kWh/m²/yr",
      number: "ADEME no.",
    },
    date: (iso) => f.dateShort(iso),
    surface: (m2) => `${f.decimal(m2, 1)} m²`,
    conso: (v) => f.int(v),
    builtLead: "Built, according to most certificates: ",
    classNote:
      "The DPE class is the worse of two ratings: energy use and greenhouse gas emissions. " +
      "It is the one that counts for letting.",
    verifyTitle: "Check this certificate on ADEME's DPE observatory",
    missing: "—",
    more: (n) => `Show ${n === 1 ? "the other certificate" : `the other ${f.int(n)} certificates`}`,
  },
  compareTitle: "For comparison",
  rowCount: (n) => `${f.int(n)} ${f.plural(n) === "one" ? "certificate" : "certificates"}`,
  rowCountApprox: (n) =>
    n >= 1_000_000
      ? `${f.decimal(n / 1_000_000, 1)} million certificates`
      : n >= 1_000
        ? `about ${f.int(roughly(n))} certificates`
        : `${f.int(n)} ${f.plural(n) === "one" ? "certificate" : "certificates"}`,
  addressNone: "No certificate recorded at this address since July 2021.",
  segmentTitle: (cls, count, share) => `${cls}: ${dpe(count)} (${pct(share)})`,
  barSummary: (row, parts) => `${row}: ${parts.join(", ")}`,
  legendLabel: "DPE class, from A (efficient) to G (inefficient)",
  rentalBanTitle: "Letting and energy rating",
  rentalBan: (steps, overseas) => [
    "A home can no longer be let (new, renewed or rolled-over lease) if rated ",
    ...steps.flatMap((s, i) => [
      i === 0 ? "" : i === steps.length - 1 ? " and " : ", ",
      { strong: classList(s.classes) },
      s.past ? ` since ${s.year}` : ` from ${s.year}`,
    ]),
    overseas ? " (overseas departments)." : " (mainland France).",
  ],
  caveats: [
    "A certificate covers one dwelling, not the building: flats at the same address have different ratings.",
    "Since 1 January 2026 the calculation favours electric heating: an older certificate may show one class too low (one at most).",
  ],
  source: (date) =>
    `Source: ADEME, certificates for existing homes since July 2021${date ? `, data as of ${f.dateLong(date)}` : ""}.`,
  pdfLabel: "Energy performance",
  pdfAddress: (total, parts) =>
    `At the address: ${f.int(total)} ${f.plural(total) === "one" ? "certificate" : "certificates"} — ` +
    parts.map(([c, n]) => `${c} ${f.int(n)}`).join(", "),
  pdfLine: (p) =>
    [
      p.commune !== null && `F or G: ${pct(p.commune)} in the commune`,
      p.france !== null && `${pct(p.france)} in France`,
    ]
      .filter(Boolean)
      .join(" · "),
};
