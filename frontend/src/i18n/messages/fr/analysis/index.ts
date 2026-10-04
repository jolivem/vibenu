import { air } from "./air";
import { cadastre } from "./cadastre";
import { climate } from "./climate";
import { elections } from "./elections";
import { keyFigures } from "./keyFigures";
import { localTax } from "./localTax";
import { mobility } from "./mobility";
import { nearby } from "./nearby";
import { pdf } from "./pdf";
import { population } from "./population";
import { realEstate } from "./realEstate";
import { risks } from "./risks";
import { screen } from "./screen";
import { sections } from "./sections";
import { security } from "./security";

/**
 * Tous les messages de la page d'analyse, un domaine par fichier. Chargés par le
 * fournisseur d'analyse seulement : l'accueil et « À propos » ne les embarquent pas.
 */
export const analysis = {
  sections,
  population,
  localTax,
  security,
  elections,
  climate,
  air,
  risks,
  cadastre,
  nearby,
  mobility,
  realEstate,
  keyFigures,
  screen,
  pdf,
};

export type AnalysisMessages = typeof analysis;
