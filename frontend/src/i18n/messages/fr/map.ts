import type { EraId } from "@/components/map/historicalLayers";
import { createFormat } from "../../format";
import type { Rich } from "../../types";

const f = createFormat("fr");

interface EraTexts {
  /** La pastille de la frise — une date, assez courte pour tenir. */
  shortLabel: string;
  /** Le nom du document. */
  label: string;
  /** La période couverte, en toutes lettres. */
  period: string;
  /** Une phrase de contexte : la valeur éditoriale de la card. */
  context: string;
}

/**
 * Cartes MapLibre : panneau de calques, infobulles, frise historique. Présent sur toutes
 * les pages qui montent une carte, d'où sa place dans le fournisseur de base et non dans
 * celui de l'analyse. Les libellés de zonage (noms de PPR) viennent des données.
 */
export const map = {
  layerPanel: {
    basemap: "Fond de carte",
    risks: "Risques",
    overlays: "Calques",
  },
  /** Fonds de carte, par identifiant de choix. */
  basemaps: {
    "fond-plan": "Plan",
    "fond-ortho": "Photo aérienne",
    "fond-relief": "Relief (LiDAR HD)",
  } as Record<string, string>,
  /** Couches de risques (rasters du BRGM), par identifiant de couche. */
  riskLayers: {
    "risk-argile": "Retrait-gonflement argiles",
    "risk-seisme": "Zonage sismique",
  } as Record<string, string>,
  /** Infobulles des commandes MapLibre, par clé de la bibliothèque. */
  controls: {
    "NavigationControl.ZoomIn": "Zoomer",
    "NavigationControl.ZoomOut": "Dézoomer",
    "NavigationControl.ResetBearing": "Remettre le nord en haut",
    "AttributionControl.ToggleAttribution": "Afficher ou masquer les crédits",
    "Marker.Title": "Repère de l'adresse",
    "Popup.Close": "Fermer",
  } as Record<string, string>,
  floodZonesLayer: "Zones inondables (PPR)",
  floodPerimeterLayer: "Périmètre PPR inondation",
  overlays: {
    dvf: "Prix immobiliers (DVF)",
    iris: "Quartier démographique",
    schoolSector: "Secteur collège",
  },
  /** Infobulle d'une vente DVF : le prix au m² en titre, puis une ligne par information. */
  dvfPopup: (p: { pricePerSqm: number; price: number; surface: string; date: string; propertyType: string }) => ({
    title: `${f.spaced(p.pricePerSqm)} €/m²`,
    lines: [
      `Prix : ${f.spaced(p.price)} €`,
      `Surface : ${p.surface} m²`,
      `Date : ${p.date}`,
      map.propertyTypes[p.propertyType] ?? p.propertyType,
    ],
  }),
  /** Types de bien de la base DVF, par libellé source. Un type inconnu d'ici s'affiche tel quel. */
  propertyTypes: {
    Appartement: "Appartement",
    Maison: "Maison",
    Dépendance: "Dépendance",
  } as Record<string, string>,
  floodZonePopupTitle: "Zone inondable",
  floodPerimeterPopup: {
    title: "Périmètre d'un plan de prévention des risques (PPR) inondation",
    note: "Zonage détaillé non publié : ce contour n'indique pas les zones inondables.",
  },
  history: {
    timelineAria: "Époque affichée",
    today: "Aujourd'hui",
    currentView: "Vue actuelle",
    oldView: "Vue ancienne",
    /** Curseur de fondu entre l'époque choisie et la vue actuelle. */
    blendAria: (era: { label: string; period: string } | null) =>
      era
        ? `Fondu entre ${era.label.toLowerCase()} ${era.period} et la vue actuelle`
        : "Fondu entre la vue ancienne et la vue actuelle",
    /** Annonce la part de l'époque, et non la position du curseur : c'est ce que l'écran montre. */
    blendValue: (period: string | null, value: number) =>
      period !== null ? `${period} à ${value} %` : `${value} %`,
    eraHeading: (label: string, period: string) => `${label} — ${period}.`,
    currentContext: [
      { strong: "Vue actuelle." },
      " Photographies aériennes les plus récentes de l'IGN. Choisissez une époque dans la frise pour la superposer, puis faites glisser le curseur pour passer de l'une à l'autre.",
    ] as Rich,
    /** Dire le trou plutôt que de le taire : l'absence de couverture est une information sur le lieu. */
    missingCoverage: (eras: ReadonlyArray<{ label: string; period: string }>) =>
      `Sans couverture IGN à cet endroit : ${eras.map((era) => `${era.label.toLowerCase()} ${era.period}`).join(", ")}.`,
    eras: {
      "cassini": {
        shortLabel: "~1750",
        label: "Carte de Cassini",
        period: "vers 1750",
        context:
          "Le premier levé géométrique de tout le royaume, dressé par quatre générations de Cassini. Elle montre les villages, les chemins et les moulins d'avant la Révolution — mais pas les parcelles : à cette échelle, seul le bâti groupé est représenté.",
      },
      "etat-major": {
        shortLabel: "1820-66",
        label: "Carte de l'état-major",
        period: "1820-1866",
        context:
          "Levée au 1/40 000 par les officiers du Dépôt de la Guerre, elle décrit la France juste avant l'industrialisation : le parcellaire agricole d'avant le remembrement, les forêts, et les bourgs avant l'arrivée du chemin de fer.",
      },
      "scan50-1950": {
        shortLabel: "1950",
        label: "Carte de 1950",
        period: "vers 1950",
        context:
          "La carte topographique de l'après-guerre, avant les grands ensembles, les rocades et l'étalement pavillonnaire. C'est l'état de référence auquel se compare tout ce qui a été construit depuis.",
      },
      "ortho-1950-1965": {
        shortLabel: "1950-65",
        label: "Photographies aériennes",
        period: "1950-1965",
        context:
          "La première couverture photographique complète du territoire. À la différence des cartes, elle ne représente rien : elle enregistre. On y voit le bâti réel, les jardins, les friches — et souvent une campagne là où il y a aujourd'hui un lotissement.",
      },
      "ortho-1965-1980": {
        shortLabel: "1965-80",
        label: "Photographies aériennes",
        period: "1965-1980",
        context:
          "Les deux décennies qui ont le plus transformé le paysage français : grands ensembles, zones industrielles, remembrement agricole et premières rocades.",
      },
      "ortho-2000-2005": {
        shortLabel: "2000-05",
        label: "Photographies aériennes",
        period: "2000-2005",
        context:
          "Le début des années 2000, assez proche pour reconnaître les lieux et assez ancien pour mesurer ce qui a été construit depuis.",
      },
    } satisfies Record<EraId, EraTexts> as Record<EraId, EraTexts>,
  },
};

export type MapMessages = typeof map;
