import type { CadastreMessages } from "../../fr/analysis/cadastre";
import { createFormat } from "../../../format";

const f = createFormat("en");

export const cadastre: CadastreMessages = {
  title: "Cadastre & planning",
  parcelTitle: "Plot",
  surface: (m2) => (m2 >= 10_000 ? `${(m2 / 10_000).toFixed(2)} ha` : `${f.int(m2)} m²`),
  parcelReference: (section, numero) => `Section ${section} · no. ${numero}`,
  zoneTitle: "PLU zone (local plan)",
  zoneTypes: {
    U: {
      label: "Urban",
      gloss:
        "an area already built up, or whose services are sufficient to serve new buildings",
    },
    AUc: {
      label: "To be developed",
      gloss:
        "intended for development, the services on its immediate edge having sufficient capacity",
    },
    AUs: {
      label: "To be developed later",
      gloss:
        "intended for development, but opening it up first requires the local plan to be amended or revised",
    },
    A: {
      label: "Agricultural",
      gloss: "land protected for its agronomic, biological or economic potential",
    },
    N: {
      label: "Natural",
      gloss:
        "protected natural or forest areas — quality of the sites, natural resources, or risk prevention",
    },
  },
  zoneGloss: (label, gloss, code) => [
    { strong: label },
    `: ${gloss}. Only this category is national — the detail of sector “${code}” is set by the regulations of the commune's local plan (PLU).`,
  ],
  prescriptionsTitle: "Planning restrictions",
  sourceLanguageNote: "Official wording from the commune's local plan, shown in French.",
};
