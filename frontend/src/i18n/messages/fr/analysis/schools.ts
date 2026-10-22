import type { SchoolOfferCodeDto, SchoolVoieDto } from "@/types/location-analysis";
import { createFormat } from "../../../format";

const f = createFormat("fr");

/** « 650 m », « 1,2 km ». */
const distance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${f.decimal(m / 1000, 1)} km`);

/** Valeur ajoutée signée : « +3 », « −2 », « 0 ». Le signe moins typographique, pas le trait d'union. */
const signed = (v: number) => (v > 0 ? `+${f.decimal(v, 1)}` : v < 0 ? `−${f.decimal(-v, 1)}` : "0");

/** Section « Enseignement » : carte des établissements, card Collèges, card Lycées. */
export const schools = {
  /** Carte en tête de chaque card : la ligne de tête dit déjà ce qu'elle montre. */
  map: {
    hint: "Cliquez sur un point pour afficher l'établissement et sa réussite à l'examen.",
    sectorHint:
      "La zone colorée est le secteur du collège cerclé de noir : toutes les adresses qu'elle contient y sont rattachées.",
  },
  titles: { college: "Collèges", lycee: "Lycées" },
  /** Ligne de tête de chaque card. */
  lead: (level: "college" | "lycee", count: number, rayon: number) => {
    const noun = level === "college" ? (count > 1 ? "collèges" : "collège") : count > 1 ? "lycées" : "lycée";
    return `${count} ${noun} à moins de ${distance(rayon)} ou parmi les plus proches.`;
  },
  /** Mode commune : ceux de la commune, puis, s'il en manque, les plus proches hors commune. */
  leadCommune: (level: "college" | "lycee", inside: number, outside: number) => {
    const noun = (n: number) => (level === "college" ? (n > 1 ? "collèges" : "collège") : n > 1 ? "lycées" : "lycée");
    const plusProche = (n: number) => (n > 1 ? `les ${n} plus proches` : "le plus proche");
    if (outside === 0) return `${inside} ${noun(inside)} dans la commune.`;
    if (inside === 0) return `Aucun ${noun(1)} dans la commune ; ${plusProche(outside)} hors de la commune :`;
    return `${inside} ${noun(inside)} dans la commune, et ${plusProche(outside)} hors de la commune.`;
  },
  /** Sous le nom d'un établissement pris hors de la commune analysée. */
  outside: (commune: string | null, dist: number) =>
    `${commune ? `À ${commune}, ` : "Hors de la commune, "}${distance(dist)} du centre`,
  /** Entre un terme et sa définition : le français met une espace avant les deux-points. */
  labelSeparator: " : ",
  /** Définitions affichées au-dessus de chaque tableau : terme, puis explication. */
  explain: (level: "college" | "lycee") => [
    {
      term: "Valeur ajoutée",
      definition:
        `écart, en points, entre la réussite ${level === "college" ? "au brevet" : "au bac"} de l'établissement et celle qu'on attendait de ses élèves, compte tenu de leur âge, de leur milieu social et de leur niveau ${level === "college" ? "à l'entrée en 6e" : "au brevet"}. ` +
        "+3 : il fait réussir mieux que prévu ; −3 : moins bien ; 0 : comme attendu. C'est ce qui mesure l'apport de l'établissement, plus que le taux de réussite brut.",
    },
    {
      term: "IPS",
      definition:
        "indice de position sociale des élèves, calculé d'après la profession de leurs parents. Autour de 100 en moyenne nationale ; plus il est élevé, plus le public est favorisé. Il décrit le recrutement, pas la qualité de l'enseignement.",
    },
  ],
  /** Sigles de l'offre, définis sous la valeur ajoutée et l'IPS quand un établissement de la liste les affiche. */
  explainOffer: {
    ulis: {
      term: "ULIS",
      definition:
        "unité localisée pour l'inclusion scolaire : un dispositif qui accueille des élèves en situation de handicap (troubles cognitifs, moteurs, sensoriels…). Ils suivent les cours d'une classe ordinaire et retrouvent, une partie du temps, un enseignant spécialisé.",
    },
    segpa: {
      term: "SEGPA",
      definition:
        "section d'enseignement général et professionnel adapté : des classes de la 6e à la 3e pour des élèves aux difficultés scolaires durables, avec des effectifs réduits et une découverte des métiers.",
    },
  } satisfies Partial<Record<SchoolOfferCodeDto, { term: string; definition: string }>>,
  /** Défini sous les autres termes quand le tableau compte au moins une valeur absente. */
  explainNotPublished: {
    term: "n. p.",
    definition:
      "non publié. Le ministère ne calcule pas la valeur ajoutée sous un nombre minimal de candidats, et ne publie pas toujours les autres chiffres (établissement récent, privé, ou sans élèves à cet examen).",
  },
  none: { college: "Aucun collège trouvé à proximité.", lycee: "Aucun lycée trouvé à proximité." },
  /** En-têtes du tableau ; les colonnes numériques sont des boutons de tri. */
  columns: {
    name: "Établissement",
    distance: "Distance",
    reussite: "Réussite",
    va: "Valeur ajoutée",
    ips: "IPS",
    eleves: "Élèves / classe",
  },
  /** Infobulle des en-têtes. */
  columnHelp: {
    reussite: "Taux de réussite au dernier brevet ou baccalauréat publié",
    va: "Écart en points entre la réussite observée et celle qu'attendait le profil des élèves",
    ips: "Indice de position sociale des élèves : plus il est élevé, plus le milieu est favorisé",
    eleves: "Nombre moyen d'élèves par division",
  },
  sortBy: (column: string) => `Trier par ${column.toLowerCase()}`,
  distance,
  percent: (v: number) => `${f.decimal(v, 1)} %`,
  signed,
  ips: (v: number) => f.decimal(v, 1),
  eleves: (v: number) => f.decimal(v, 1),
  /** Référence sous une valeur : la moyenne du département. */
  department: (formatted: string) => `dép. ${formatted}`,
  notPublished: "n. p.",
  notPublishedHelp: "Non publié : effectif trop faible ou établissement non concerné",
  /** Bac d'un lycée : la voie, quand le lycée en a deux. */
  exam: { brevet: "Brevet", bacGt: "Bac général et techno.", bacPro: "Bac pro" },
  secteur: { public: "Public", prive: "Privé" },
  educationPrioritaire: { REP: "REP", "REP+": "REP+" } as Record<"REP" | "REP+", string>,
  sectorBadge: "Collège de secteur",
  voies: {
    generale: "Général",
    technologique: "Technologique",
    professionnelle: "Professionnel",
  } satisfies Record<SchoolVoieDto, string>,
  offre: {
    cantine: "Cantine",
    internat: "Internat",
    ulis: "ULIS",
    segpa: "SEGPA",
    post_bac: "Post-bac",
    apprentissage: "Apprentissage",
    agricole: "Lycée agricole",
    metiers: "Lycée des métiers",
    europeenne: "Section européenne",
    internationale: "Section internationale",
    sport: "Section sportive",
    arts: "Section arts",
    cinema: "Section cinéma",
    theatre: "Section théâtre",
  } satisfies Record<SchoolOfferCodeDto, string>,
  /** Infobulle des sigles. */
  offreHelp: {
    ulis: "Unité localisée pour l'inclusion scolaire : accueil d'élèves en situation de handicap",
    segpa: "Section d'enseignement général et professionnel adapté",
  } as Partial<Record<SchoolOfferCodeDto, string>>,
  /** « Section sportive : rugby, football ». */
  sports: (list: string[]) => `Section sportive : ${list.join(", ").toLowerCase()}`,
  langues: {
    lv1: (list: string[]) => `LV1 : ${list.join(", ")}`,
    lv2: (list: string[]) => `LV2 : ${list.join(", ")}`,
    lca: (list: string[]) => `Langues anciennes : ${list.join(", ")}`,
  },
  /** Lycée professionnel : insertion des sortants. */
  insertion: (taux: number, annee: number) => `${f.decimal(taux, 0)} % en emploi 6 mois après la sortie (${annee})`,
  links: { onisep: "Fiche ONISEP", site: "Site" },
  /** Pied de card. */
  note: (level: "college" | "lycee") =>
    `${level === "college" ? "Réussite au brevet" : "Réussite au baccalauréat"}, valeur ajoutée et indice de position sociale (IPS) : ministère de l'Éducation nationale (DEPP), dernière session publiée. ` +
    "La valeur ajoutée compare la réussite observée à celle qu'attendait le profil des élèves ; la DEPP déconseille d'en tirer un palmarès. " +
    (level === "college"
      ? "« dép. » : moyenne des collèges du département."
      : "« dép. » : moyenne des lycées du même type dans le département — général et technologique, ou professionnel ; un lycée professionnel se compare aux lycées professionnels."),
  /** Fiche PDF : une ligne par établissement, les plus proches. */
  /** `lieu` : la distance en mode adresse, la commune voisine en mode commune, rien sinon. */
  pdfLine: (nom: string, lieu: string | null, reussite: number | null, va: number | null) =>
    nom +
    (lieu ? ` — ${lieu}` : "") +
    (reussite !== null ? ` · réussite ${f.decimal(reussite, 0)} %` : "") +
    (va !== null ? ` · VA ${signed(va)}` : ""),
};

export type SchoolsMessages = typeof schools;
