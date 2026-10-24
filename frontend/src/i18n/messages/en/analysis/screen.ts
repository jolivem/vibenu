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
  debugSummary: (tokens) => `Data sent to the model (debug) — ~${tokens} tokens`,
  backToTop: "Back to top",
  newAnalysis: "New analysis",
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
    copyLinkAria: "Copy link",
  },
  readingMode: {
    label: "Level of detail",
    essential: "Key facts",
    detailed: "Detailed",
    show: "Show more",
    hide: "Show less",
  },
  pdfButton: {
    idle: "Download PDF",
    generating: "Generating...",
    waitingForInsights: "Preparing the summaries...",
  },
};
