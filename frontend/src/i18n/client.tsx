"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Format } from "./format";
import type { Locale } from "./locales";
import type { AnalysisMessages } from "./messages/fr/analysis";
import type { CommonMessages } from "./messages/fr/common";
import type { MapMessages } from "./messages/fr/map";
import type { SearchMessages } from "./messages/fr/search";

/**
 * La langue côté client : sa balise, son formateur et les messages présents sur toutes les
 * pages (communs, recherche, cartes). Les messages de l'analyse ont leur propre fournisseur, posé
 * par la page d'analyse, pour ne pas alourdir l'accueil.
 *
 * Un dictionnaire contient des fonctions et ne franchit donc pas la frontière serveur →
 * client en prop : chaque fournisseur (`FrProvider`, `EnProvider`) importe lui-même le
 * sien. C'est aussi ce qui garantit qu'une seule langue part au navigateur.
 *
 * Les modules `.ts` purs et les sous-composants réutilisés par les pages `/commune/*`
 * (rendus côté serveur) ne lisent jamais ce contexte : ils reçoivent leurs messages en
 * paramètre ou en prop.
 */
export interface I18n {
  locale: Locale;
  fmt: Format;
  common: CommonMessages;
  search: SearchMessages;
  map: MapMessages;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ value, children }: { value: I18n; children: ReactNode }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n : aucun fournisseur de langue au-dessus de ce composant.");
  return value;
}

const AnalysisI18nContext = createContext<AnalysisMessages | null>(null);

export function AnalysisI18nProvider({ value, children }: { value: AnalysisMessages; children: ReactNode }) {
  return <AnalysisI18nContext.Provider value={value}>{children}</AnalysisI18nContext.Provider>;
}

/**
 * Messages de l'analyse, pour `AnalysisScreen` et les composants client qu'il monte. Les
 * cards, elles, ne lisent pas ce contexte : elles reçoivent leur tranche en prop, ce qui
 * les laisse utilisables par les pages `/commune/*`, rendues côté serveur.
 */
export function useAnalysisI18n(): AnalysisMessages {
  const value = useContext(AnalysisI18nContext);
  if (!value) throw new Error("useAnalysisI18n : aucun fournisseur de messages d'analyse au-dessus de ce composant.");
  return value;
}
