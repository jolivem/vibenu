import type { NearbyMessages } from "../../fr/analysis/nearby";
import { createFormat } from "../../../format";

const f = createFormat("en");

function distance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  const km = meters / 1000;
  return `${f.number(km >= 10 ? Math.round(km) : Math.round(km * 10) / 10)} km`;
}

const density = (value: number, digits: number) => f.decimal(value, digits, digits);

const rubrics: Record<string, string> = {
  generalistes: "General practitioners",
  specialistes: "Specialist doctors",
  pharmacies: "Pharmacies",
  hopitaux: "Hospitals and clinics",
  urgences: "Emergency departments",
  ecoles: "Nursery and primary schools",
  colleges: "Lower secondary schools (collèges)",
  lycees: "Upper secondary schools (lycées)",
  supermarches: "Supermarkets",
  epiceries: "Grocery shops",
  boulangeries: "Bakeries",
  poste: "Post offices",
  banques: "Banks",
  bibliotheques: "Libraries",
  cinemas: "Cinemas",
  sport: "Sports facilities",
  gares: "Railway stations",
};

export const nearby: NearbyMessages = {
  walking: (minutes) => `${minutes} min walk`,
  walkingHours: (hours, minutes) =>
    minutes === 0 ? `${hours} h walk` : `${hours} h ${String(minutes).padStart(2, "0")} walk`,
  distance,
  after: (proximity) => `— ${proximity}`,
  neighborhood: {
    title: "Neighbourhood",
    families: {
      education: "Education",
      care: "Healthcare",
      shops: "Shops & services",
      leisure: "Culture & leisure",
      other: "Other",
    },
    categories: {
      school: "Education",
      supermarket: "Supermarket",
      bakery: "Bakery",
      pharmacy: "Pharmacy",
      doctor: "Doctor",
      park: "Park",
      sport: "Sport",
      restaurant: "Restaurant",
      post_office: "Post office",
      bank: "Bank",
      library: "Library",
      hospital: "Hospital or clinic",
      emergency: "Emergency department",
    },
    sectorTag: "catchment school",
    truncated: "Not a complete list — only the nearest places are shown.",
    none: "No amenities found nearby.",
    unnamed: {
      school: "School",
      supermarket: "Supermarket",
      bakery: "Bakery",
      pharmacy: "Pharmacy",
      doctor: "Doctor",
      park: "Park",
      sport: "Sports facility",
      restaurant: "Restaurant",
      post_office: "Post office",
      bank: "Bank",
      library: "Library",
      hospital: "Hospital",
      emergency: "Emergency department",
    },
  },
  school: {
    title: "School catchment",
    levels: {
      college: "Catchment lower secondary school (collège)",
      lycee: "Catchment upper secondary school (lycée)",
    },
    mapHint: (level) =>
      `The coloured area is the catchment of the ${level === "college" ? "collège" : "lycée"}: every address inside it is assigned to that school.`,
    footnote: (uai) => `Official state-school catchment.${uai ? ` School UAI code: ${uai}.` : ""}`,
  },
  communeEquipment: {
    title: "Amenities in the commune",
    families: {
      sante: "Healthcare",
      enseignement: "Education",
      commerces: "Shops",
      services: "Services",
      loisirs: "Leisure",
      transports: "Transport",
    },
    rubrics,
    count: (value) => f.int(value),
    rubricLead: (label) => `${label}: `,
    density: (p) =>
      p.uncertain || p.france === null
        ? `${density(p.per10k, p.digits)} per 10,000 inhab.${p.uncertain ? " (location uncertain)" : ""}`
        : `${density(p.per10k, p.digits)} per 10,000 inhab. (France ${density(p.france, p.digits)})`,
    line: (count, densityText) => (densityText !== null ? `${count} — ${densityText}` : count),
    absent: (labels) =>
      `Not present in the commune: ${labels.map((label) => label.charAt(0).toLowerCase() + label.slice(1)).join(", ")}`,
    footnote: (p) =>
      p.withDensity
        ? `Amenities recorded in the commune in 2025 (${f.int(p.population)} inhabitants), and their density per 10,000 inhabitants compared with France as a whole.`
        : `Amenities recorded in the commune in 2025 (${f.int(p.population)} inhabitants). Below ${f.int(p.minPopulation)} inhabitants, densities are not computed: a single unit is enough to distort them.`,
    arrondissementNote:
      "The census assigns some amenities to the address of the body that runs them: at arrondissement level, the counts may be too high or too low. The comparison with France is not shown when the arrondissement holds more than half of its city's amenities.",
  },
};
