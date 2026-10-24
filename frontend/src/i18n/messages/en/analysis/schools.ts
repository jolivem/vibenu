import type { SchoolsMessages } from "../../fr/analysis/schools";
import { createFormat } from "../../../format";

const f = createFormat("en");

const distance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${f.decimal(m / 1000, 1)} km`);
const signed = (v: number) => (v > 0 ? `+${f.decimal(v, 1)}` : v < 0 ? `−${f.decimal(-v, 1)}` : "0");

export const schools: SchoolsMessages = {
  map: {
    hint: "Click a dot to see the school and its exam pass rate.",
    sectorHint:
      "The coloured area is the catchment of the collège circled in black: every address inside it is assigned to that school.",
  },
  titles: { college: "Collèges (ages 11-15)", lycee: "Lycées (ages 15-18)" },
  lead: (level, count, rayon) => {
    const noun = level === "college" ? (count === 1 ? "collège" : "collèges") : count === 1 ? "lycée" : "lycées";
    return `${count} ${noun} within ${distance(rayon)} or among the nearest.`;
  },
  leadCommune: (level, inside, outside) => {
    const noun = (n: number) => (level === "college" ? (n === 1 ? "collège" : "collèges") : n === 1 ? "lycée" : "lycées");
    const nearest = (n: number) => (n === 1 ? `the nearest ${noun(1)}` : `the ${n} nearest`);
    if (outside === 0) return `${inside} ${noun(inside)} in the commune.`;
    if (inside === 0) return `No ${noun(1)} in the commune; ${nearest(outside)} outside it:`;
    return `${inside} ${noun(inside)} in the commune, and ${nearest(outside)} outside it.`;
  },
  outside: (commune, dist) => `${commune ? `In ${commune}, ` : "Outside the commune, "}${distance(dist)} from the centre`,
  labelSeparator: ": ",
  explainToggle: { show: "How to read this table", hide: "Hide explanations" },
  explain: (level) => [
    {
      term: "Value added",
      definition:
        `gap, in points, between the school's ${level === "college" ? "brevet" : "baccalauréat"} pass rate and the one expected from its pupils, given their age, social background and attainment ${level === "college" ? "on entering year 7 (6e)" : "at the brevet"}. ` +
        "+3: pupils do better than expected; −3: worse; 0: as expected. It measures what the school adds, more than the raw pass rate does.",
    },
    {
      term: "SPI",
      definition:
        "social position index of the pupils, based on their parents' occupations. Around 100 on average nationally; the higher it is, the more advantaged the intake. It describes who attends, not the quality of teaching.",
    },
    {
      term: "dept.",
      definition:
        level === "college"
          ? "average of the collèges in the département."
          : "average of lycées of the same type in the département — general and technological, or vocational; a vocational lycée is compared with vocational lycées.",
    },
  ],
  explainNotPublished: {
    term: "n/a",
    definition:
      "not published. The Ministry does not compute value added below a minimum number of candidates, and does not always publish the other figures (new or private school, or no pupils sitting that exam).",
  },
  none: { college: "No collège found nearby.", lycee: "No lycée found nearby." },
  columns: {
    name: "School",
    distance: "Distance",
    reussite: "Pass rate",
    va: "Value added",
    ips: "SPI",
    eleves: "Pupils / class",
  },
  columnsShort: {
    reussite: "Pass rate",
    va: "VA",
    ips: "SPI",
    eleves: "Pupils/cl.",
  },
  departmentSummary: (refs) =>
    "Département averages: " +
    [
      refs.reussite && `pass rate ${refs.reussite}`,
      refs.ips && `SPI ${refs.ips}`,
      refs.eleves && `${refs.eleves} pupils per class`,
    ]
      .filter(Boolean)
      .join(" · "),
  columnHelp: {
    reussite: "Pass rate at the latest published brevet or baccalauréat",
    va: "Gap in points between the observed pass rate and the one expected from the pupils' profile",
    ips: "Social position index of the pupils: the higher, the more advantaged the background",
    eleves: "Average number of pupils per class",
  },
  sortBy: (column) => `Sort by ${column.toLowerCase()}`,
  distance,
  percent: (v) => `${f.decimal(v, 1)}%`,
  signed,
  ips: (v) => f.decimal(v, 1),
  eleves: (v) => f.decimal(v, 1),
  department: (formatted) => `dept. ${formatted}`,
  notPublished: "n/a",
  notPublishedHelp: "Not published: too few pupils, or not applicable to this school",
  exam: { brevet: "Brevet", bacGt: "General & tech. bac", bacPro: "Vocational bac" },
  secteur: { public: "State", prive: "Private" },
  educationPrioritaire: { REP: "Priority area (REP)", "REP+": "Priority area (REP+)" },
  sectorBadge: "Catchment collège",
  voies: {
    generale: "General",
    technologique: "Technological",
    professionnelle: "Vocational",
  },
  offre: {
    cantine: "Canteen",
    internat: "Boarding",
    post_bac: "Post-bac",
    apprentissage: "Apprenticeships",
    agricole: "Agricultural lycée",
    metiers: "Lycée des métiers",
    europeenne: "European section",
    internationale: "International section",
    sport: "Sports section",
    arts: "Arts section",
    cinema: "Film section",
    theatre: "Theatre section",
  },
  sports: (list) => `Sports section: ${list.join(", ").toLowerCase()}`,
  langues: {
    lv1: (list) => `1st language: ${list.join(", ")}`,
    lv2: (list) => `2nd language: ${list.join(", ")}`,
    lca: (list) => `Classical languages: ${list.join(", ")}`,
  },
  insertion: (taux, annee) => `${f.decimal(taux, 0)}% in work 6 months after leaving (${annee})`,
  links: { onisep: "ONISEP page" },
  note: (level) =>
    `${level === "college" ? "Brevet pass rate" : "Baccalauréat pass rate"}, value added and social position index (SPI): French Ministry of Education (DEPP), latest published session.`,
  pdfLine: (nom, lieu, reussite, va) =>
    nom +
    (lieu ? ` — ${lieu}` : "") +
    (reussite !== null ? ` · pass rate ${f.decimal(reussite, 0)}%` : "") +
    (va !== null ? ` · VA ${signed(va)}` : ""),
};
