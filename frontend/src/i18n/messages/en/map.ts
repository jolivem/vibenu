import type { MapMessages } from "../fr/map";
import { createFormat } from "../../format";

const f = createFormat("en");

const propertyTypes: Record<string, string> = {
  Appartement: "Flat",
  Maison: "House",
  Dépendance: "Outbuilding",
};

export const map: MapMessages = {
  layerPanel: {
    basemap: "Base map",
    risks: "Risks",
    overlays: "Layers",
  },
  basemaps: {
    "fond-plan": "Street map",
    "fond-ortho": "Aerial photo",
    "fond-relief": "Relief (LiDAR HD)",
  },
  riskLayers: {
    "risk-argile": "Clay shrink-swell",
    "risk-seisme": "Seismic zoning",
  },
  controls: {
    "NavigationControl.ZoomIn": "Zoom in",
    "NavigationControl.ZoomOut": "Zoom out",
    "NavigationControl.ResetBearing": "Reset bearing to north",
    "AttributionControl.ToggleAttribution": "Toggle attribution",
    "Marker.Title": "Address marker",
    "Popup.Close": "Close",
  },
  floodZonesLayer: "Flood zones (PPR)",
  floodPerimeterLayer: "Flood PPR outline",
  overlays: {
    dvf: "Property prices (DVF)",
    iris: "Statistical neighbourhood",
    schoolSector: "School catchment",
  },
  dvfPopup: (p) => ({
    title: `€${f.int(p.pricePerSqm)}/m²`,
    lines: [
      `Price: €${f.int(p.price)}`,
      `Floor area: ${p.surface} m²`,
      `Date: ${p.date}`,
      propertyTypes[p.propertyType] ?? p.propertyType,
    ],
  }),
  propertyTypes,
  floodZonePopupTitle: "Flood zone",
  floodPerimeterPopup: {
    title: "Outline of a flood risk prevention plan (PPR)",
    note: "Detailed zoning not published: this outline does not show the flood zones.",
  },
  history: {
    timelineAria: "Period shown",
    today: "Today",
    currentView: "Current view",
    oldView: "Historical view",
    blendAria: (era) =>
      era
        ? `Blend between the ${era.label.toLowerCase()} (${era.period}) and the current view`
        : "Blend between the historical view and the current view",
    blendValue: (period, value) => (period !== null ? `${period} at ${value}%` : `${value}%`),
    eraHeading: (label, period) => `${label} — ${period}.`,
    currentContext: [
      { strong: "Current view." },
      " The most recent IGN aerial photographs. Pick a period on the timeline to overlay it, then drag the slider to move from one to the other.",
    ],
    missingCoverage: (eras) =>
      `No IGN coverage at this location: ${eras.map((era) => `${era.label.toLowerCase()} ${era.period}`).join(", ")}.`,
    eras: {
      cassini: {
        shortLabel: "~1750",
        label: "Cassini map",
        period: "around 1750",
        context:
          "The first geometric survey of the whole kingdom, drawn up by four generations of the Cassini family. It shows the villages, roads and mills from before the Revolution — but not the plots: at this scale, only clustered buildings are drawn.",
      },
      "etat-major": {
        shortLabel: "1820-66",
        label: "État-major map",
        period: "1820-1866",
        context:
          "Surveyed at 1:40,000 by army officers, it describes France just before industrialisation: farmland before land consolidation, forests, and market towns before the railway arrived.",
      },
      "scan50-1950": {
        shortLabel: "1950",
        label: "1950 map",
        period: "around 1950",
        context:
          "The post-war topographic map, before the large housing estates, ring roads and suburban sprawl. It is the baseline against which everything built since can be compared.",
      },
      "ortho-1950-1965": {
        shortLabel: "1950-65",
        label: "Aerial photographs",
        period: "1950-1965",
        context:
          "The first complete photographic coverage of the country. Unlike maps, it depicts nothing: it records. You see the actual buildings, gardens and wasteland — and often open countryside where a housing estate stands today.",
      },
      "ortho-1965-1980": {
        shortLabel: "1965-80",
        label: "Aerial photographs",
        period: "1965-1980",
        context:
          "The two decades that changed the French landscape the most: large housing estates, industrial zones, farmland consolidation and the first ring roads.",
      },
      "ortho-2000-2005": {
        shortLabel: "2000-05",
        label: "Aerial photographs",
        period: "2000-2005",
        context:
          "The early 2000s, recent enough to recognise the place and old enough to measure what has been built since.",
      },
    },
  },
};
