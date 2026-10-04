"use client";

import type { ReactNode } from "react";
import { I18nProvider, type I18n } from "./client";
import { createFormat } from "./format";
import { common } from "./messages/en/common";
import { map } from "./messages/en/map";
import { search } from "./messages/en/search";
import { withPseudo } from "./pseudo";

const value: I18n = {
  locale: "en",
  fmt: createFormat("en"),
  common: withPseudo(common),
  search: withPseudo(search),
  map: withPseudo(map),
};

/** Pose l'anglais pour tout le sous-arbre. Posé par le layout racine anglais. */
export function EnProvider({ children }: { children: ReactNode }) {
  return <I18nProvider value={value}>{children}</I18nProvider>;
}
