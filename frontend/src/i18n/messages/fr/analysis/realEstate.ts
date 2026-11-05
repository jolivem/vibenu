import type { BuildingPeriodCodeDto, PropertyKindDto } from "@/types/location-analysis";
import { createFormat } from "../../../format";

const f = createFormat("fr");

const s = (n: number) => (n > 1 ? "s" : "");

/** Card « Immobilier » : transactions DVF autour de l'adresse ou dans la commune. */
export const realEstate = {
  title: "Immobilier",
  /** Libellé de la médiane de chaque type de bien. */
  kinds: { appartement: "Appartements", maison: "Maisons" } satisfies Record<PropertyKindDto, string> as Record<PropertyKindDto, string>,
  /** Médiane d'un type, avec le nombre de ventes sur lequel elle porte. */
  median: (kind: string, pricePerSquareMeter: number, count: number) =>
    `${kind} : ${f.int(pricePerSquareMeter)} €/m² (${f.int(count)} vente${s(count)})`,
  /** Sous la médiane : ce qu'elle représente pour un logement type, arrondi au millier. */
  example: (surface: number, price: number) => `Soit environ ${f.int(price)} € pour ${surface} m².`,
  /** Moins de 10 ventes du type : pas de médiane. `kind` est le libellé de `kinds`. */
  tooFew: (kind: string, count: number) =>
    `${kind} : ${f.int(count)} vente${s(count)}, trop peu pour un prix médian.`,
  /** Sous les médianes, mode adresse : sur quelles ventes elles portent. */
  nearby: (count: number, from: number, to: number, radius: number) =>
    `Calculées sur les ${f.int(count)} vente${s(count)} les plus proches, ${from === to ? `en ${to}` : `de ${from} à ${to}`}, dans un rayon de ${f.int(radius)} m.`,
  /** Mode commune. */
  communeBasis: (count: number) => `Calculées sur les ${f.int(count)} ventes les plus récentes de la commune.`,
  noSale: "Aucune vente récente recensée à moins de 1 km.",
  /** Alsace-Moselle : les ventes ne sont pas publiées, ce n'est pas qu'il n'y en a pas. */
  notPublished: (commune: boolean) =>
    `En Alsace et en Moselle, les ventes immobilières relèvent du Livre foncier et ne sont pas publiées dans la base DVF : pas de prix de vente pour cette ${commune ? "commune" : "adresse"}.`,
  mapHint:
    "Cliquez sur une parcelle colorée pour afficher ses ventes. Zoomez ou dézoomez pour les faire apparaître si nécessaire.",
  /** Le tableau des ventes, adresse par adresse (détail de la card). */
  list: {
    title: "Les ventes, adresse par adresse",
    intro: (sales: number, buildings: number) =>
      `${f.int(sales)} vente${s(sales)} sur ${f.int(buildings)} parcelle${s(buildings)}. À Paris comme dans les grandes villes, une parcelle est souvent un immeuble entier : plusieurs ventes d'appartements y sont courantes.`,
    head: { date: "Date", type: "Bien", surface: "Surface", price: "Prix", perSqm: "€/m²" },
    /** Parcelle sans adresse connue : « Parcelle EL 44 ». */
    parcel: (section: string, number: number) => `Parcelle ${section} ${number}`,
    unknownParcel: "Parcelle non renseignée",
    /** À la place de la distance, pour la parcelle de l'adresse analysée. */
    atAddress: "à l'adresse",
    distance: (meters: number) => `à ${f.int(Math.round(meters / 10) * 10)} m`,
    dwellings: (n: number) => `${f.int(n)} logement${s(n)}`,
    floors: (n: number) => `${n} niveau${n > 1 ? "x" : ""}`,
    built: (period: string) => `construit ${period}`,
    median: (pricePerSqm: number) => `médiane ${f.int(pricePerSqm)} €/m²`,
    /** Une vente de plusieurs logements, pour lire sa surface. */
    saleDwellings: (n: number) => `${n} logements`,
    surface: (m2: number) => `${f.int(m2)} m²`,
    price: (euros: number) => `${f.spaced(euros)} €`,
    perSqm: (euros: number) => f.spaced(euros),
    date: (iso: string) => f.dateShort(iso),
    /** Types de bien de la base DVF, par libellé source. */
    propertyTypes: { Appartement: "Appartement", Maison: "Maison", Dépendance: "Dépendance" } as Record<string, string>,
    /** Immeubles ou maisons : « biens » couvre les deux. */
    more: (n: number) => (n > 1 ? `Voir les ${n} autres biens` : "Voir l'autre bien"),
    /** Période de construction, par code du registre des copropriétés. */
    periods: {
      AVANT_1949: "avant 1949",
      DE_1949_A_1960: "entre 1949 et 1960",
      DE_1961_A_1974: "entre 1961 et 1974",
      DE_1975_A_1993: "entre 1975 et 1993",
      DE_1994_A_2000: "entre 1994 et 2000",
      DE_2001_A_2010: "entre 2001 et 2010",
      APRES_2011: "depuis 2011",
    } satisfies Record<BuildingPeriodCodeDto, string> as Record<BuildingPeriodCodeDto, string>,
    /** Infobulle de la période : d'où elle vient. */
    periodSource: {
      rnc: "Période déclarée au Registre national des copropriétés",
      "fichiers-fonciers": "Année des Fichiers fonciers (DGFiP), ramenée à une période",
    },
    /** Usage des Fichiers fonciers, par libellé source ; un libellé inconnu s'affiche tel quel. */
    usages: {
      "Résidentiel collectif": "Immeuble collectif",
      "Résidentiel individuel": "Maison individuelle",
      "Tertiaire & Autres": "Tertiaire",
      Dépendance: "Dépendance",
      Secondaire: "Secondaire",
    } as Record<string, string>,
    source:
      "Ventes : DVF (DGFiP), deux derniers millésimes publiés. Bâtiments : Base de données nationale des bâtiments (CSTB), qui reprend le Registre national des copropriétés et les Fichiers fonciers ; la période de construction est celle du registre quand l'immeuble y figure.",
  },
};

export type RealEstateMessages = typeof realEstate;
