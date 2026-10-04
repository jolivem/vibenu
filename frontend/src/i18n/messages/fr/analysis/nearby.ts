import type { SchoolSectorDto } from "@/types/location-analysis";
import { createFormat } from "../../../format";

const f = createFormat("fr");

/** Familles d'équipements de la card « Voisinage », dans l'ordre d'affichage. */
export type PoiFamilyKey = "education" | "care" | "shops" | "leisure" | "other";

/**
 * Distance en mètres. Deux précisions selon l'échelle : le dixième de kilomètre en dessous
 * de 10 km, l'entier au-delà — ces distances sont à vol d'oiseau, « 13,4 km » pour un
 * hôpital donnerait une précision de 100 m à un chiffre qui ignore le tracé des routes.
 */
function distance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  const km = meters / 1000;
  return `${f.spaced(km >= 10 ? Math.round(km) : Math.round(km * 10) / 10)} km`;
}

/** « 12,3 » ou « 0,45 » : une densité pour 10 000 habitants, au nombre de décimales voulu. */
const density = (value: number, digits: number) => f.decimal(value, digits, digits);

/**
 * Section « À proximité » : voisinage (mode adresse), équipements de la commune (mode
 * commune) et carte scolaire. Les noms d'équipements et d'établissements sont des noms
 * propres ; les rubriques d'équipements communaux viennent encore du serveur.
 */
export const nearby = {
  /** Temps de marche sous 2 km, distance au-delà. */
  walking: (minutes: number) => `${minutes} min à pied`,
  walkingHours: (hours: number, minutes: number) =>
    minutes === 0 ? `${hours} h à pied` : `${hours} h ${String(minutes).padStart(2, "0")} à pied`,
  distance,
  /** Distance à la suite d'un nom : « — 4 min à pied ». */
  after: (proximity: string) => `— ${proximity}`,
  neighborhood: {
    title: "Voisinage",
    families: {
      education: "Enseignement",
      care: "Soins",
      shops: "Commerces & services",
      leisure: "Culture & loisirs",
      other: "Autres",
    } satisfies Record<PoiFamilyKey, string> as Record<PoiFamilyKey, string>,
    /** Catégories d'équipements. Une catégorie inconnue s'affiche sous son code. */
    categories: {
      school: "Enseignement",
      supermarket: "Supermarché",
      bakery: "Boulangerie",
      pharmacy: "Pharmacie",
      doctor: "Médecin",
      park: "Parc",
      sport: "Sport",
      restaurant: "Restaurant",
      post_office: "Poste",
      bank: "Banque",
      library: "Bibliothèque",
      hospital: "Hôpital ou clinique",
      emergency: "Urgences",
    } as Record<string, string>,
    /** Étiquette de l'établissement auquel l'adresse est rattachée par la carte scolaire. */
    sectorTag: "de secteur",
    truncated: "Liste non exhaustive — seuls les équipements les plus proches sont affichés.",
    none: "Aucun équipement trouvé à proximité.",
    /** Nom générique d'un équipement que la source ne nomme pas. */
    unnamed: {
      school: "École",
      supermarket: "Supermarché",
      bakery: "Boulangerie",
      pharmacy: "Pharmacie",
      doctor: "Médecin",
      park: "Parc",
      sport: "Équipement sportif",
      restaurant: "Restaurant",
      post_office: "Bureau de poste",
      bank: "Banque",
      library: "Bibliothèque",
      hospital: "Hôpital",
      emergency: "Service d'urgences",
    } as Record<string, string>,
  },
  school: {
    title: "Carte scolaire",
    levels: {
      college: "Collège de secteur",
      lycee: "Lycée de secteur",
    } satisfies Record<SchoolSectorDto["niveau"], string> as Record<SchoolSectorDto["niveau"], string>,
    /**
     * Sans légende, la zone colorée pouvait se lire comme le quartier IRIS de la rubrique
     * Population, ou comme un rayon autour de l'adresse.
     */
    mapHint: (level: SchoolSectorDto["niveau"]) =>
      `La zone colorée est le secteur ${level === "college" ? "du collège" : "du lycée"} : toutes les adresses qu'elle contient y sont rattachées.`,
    footnote: (uai: string | null | undefined) =>
      `Sectorisation publique officielle.${uai ? ` Code UAI de l'établissement : ${uai}.` : ""}`,
  },
  communeEquipment: {
    title: "Équipements de la commune",
    /** Familles et rubriques, par clé. Une clé inconnue d'ici garde le libellé du serveur. */
    families: {
      sante: "Santé",
      enseignement: "Enseignement",
      commerces: "Commerces",
      services: "Services",
      loisirs: "Loisirs",
      transports: "Transports",
    } as Record<string, string>,
    rubrics: {
      generalistes: "Médecins généralistes",
      specialistes: "Médecins spécialistes",
      pharmacies: "Pharmacies",
      hopitaux: "Hôpitaux et cliniques",
      urgences: "Services d'urgences",
      ecoles: "Écoles maternelles et élémentaires",
      colleges: "Collèges",
      lycees: "Lycées",
      supermarches: "Supermarchés",
      epiceries: "Épiceries",
      boulangeries: "Boulangeries",
      poste: "Bureaux de poste",
      banques: "Banques",
      bibliotheques: "Bibliothèques",
      cinemas: "Cinémas",
      sport: "Équipements sportifs",
      gares: "Gares",
    } as Record<string, string>,
    count: (value: number) => f.spaced(value),
    /** « Médecins généralistes : » — le nombre, en gras, suit. */
    rubricLead: (label: string) => `${label} : `,
    density: (p: { per10k: number; france: number | null; digits: number; uncertain: boolean }) =>
      p.uncertain || p.france === null
        ? `${density(p.per10k, p.digits)} pour 10 000 hab.${p.uncertain ? " (localisation incertaine)" : ""}`
        : `${density(p.per10k, p.digits)} pour 10 000 hab. (France ${density(p.france, p.digits)})`,
    /** Fiche PDF : nombre, puis densité quand elle est calculée. */
    line: (count: string, densityText: string | null) =>
      densityText !== null ? `${count} — ${densityText}` : count,
    /** Les rubriques sont des noms communs : leur initiale passe en minuscule dans la liste. */
    absent: (labels: string[]) =>
      `Absents de la commune : ${labels
        .map((label) => label.charAt(0).toLocaleLowerCase("fr-FR") + label.slice(1))
        .join(", ")}`,
    footnote: (p: { population: number; withDensity: boolean; minPopulation: number }) =>
      p.withDensity
        ? `Équipements recensés dans la commune en 2025 (${f.spaced(p.population)} habitants), et leur densité pour 10 000 habitants comparée à celle de la France entière.`
        : `Équipements recensés dans la commune en 2025 (${f.spaced(p.population)} habitants). Sous ${f.spaced(p.minPopulation)} habitants, les densités ne sont pas calculées : une seule unité suffit à les fausser.`,
    /**
     * Paris, Lyon, Marseille : le recensement rattache des équipements à l'adresse de leur
     * gestionnaire, et un arrondissement peut hériter de ceux de toute la ville.
     */
    arrondissementNote:
      "Le recensement rattache certains équipements à l'adresse de leur gestionnaire : à l'échelle d'un arrondissement, les nombres peuvent être surestimés ou sous-estimés. La comparaison à la France n'est pas affichée quand l'arrondissement concentre plus de la moitié des équipements de sa ville.",
  },
};

export type NearbyMessages = typeof nearby;
