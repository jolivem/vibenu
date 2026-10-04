import type { ScreenMessages } from "../../fr/analysis/screen";
import { BRANDING } from "@/lib/site-features";

export const screen: ScreenMessages = {
  eyebrow: (city, postcode) => `Analysis${city ? ` · ${city}` : ""}${postcode ? ` · ${postcode}` : ""}`,
  metaTitle: "Address analysis",
  titleFallback: "Address to analyse",
  communePageLink: (name) => `See the ${name} page (in French) →`,
  loading: "Analysing...",
  failed: "This address could not be analysed.",
  locationTitle: "Location",
  historyTitle: "The place in the past",
  floodHint: {
    zoning:
      "Tick to show the zones on the map. PPR: risk prevention plan, the state document that defines flood zones and restricts building in them.",
    perimeterOnly:
      "Tick to show the zones on the map. Only the outline of the flood risk prevention plan (PPR) is published here, not its detailed zoning.",
    none: "Tick to show the zones on the map. No flood risk prevention plan (PPR) zoning is published here.",
  },
  aiNotice:
    "The “In brief” summaries are written by an artificial intelligence using only the data shown on this page. The figures and sources around them come directly from the public files cited.",
  debugSummary: (tokens) => `Data sent to the model (debug) — ~${tokens} tokens`,
  backToTop: "Back to top",
  share: {
    trigger: "Share",
    panelTitle: "Share this analysis",
    linkAria: "Link to the analysis",
    copy: "Copy",
    copied: "Copied",
    title: (label) => `${label} — ${BRANDING.name} analysis`,
    text: (label) => `Here is the analysis of ${label} on ${BRANDING.name}:`,
    emailLabel: "Email",
    targetAria: (target) => `Share via ${target}`,
    nativeAria: "Share via another app",
    nativeTitle: "Another app…",
  },
  pdfButton: {
    idle: "Download PDF",
    generating: "Generating...",
    waitingForInsights: "Preparing the summaries...",
  },
};
