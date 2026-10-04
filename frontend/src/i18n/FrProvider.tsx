"use client";

import type { ReactNode } from "react";
import { I18nProvider, type I18n } from "./client";
import { createFormat } from "./format";
import { common } from "./messages/fr/common";
import { map } from "./messages/fr/map";
import { search } from "./messages/fr/search";
import { withPseudo } from "./pseudo";

const value: I18n = {
  locale: "fr",
  fmt: createFormat("fr"),
  common: withPseudo(common),
  search: withPseudo(search),
  map: withPseudo(map),
};

/** Pose le français pour tout le sous-arbre. Posé par le layout racine français. */
export function FrProvider({ children }: { children: ReactNode }) {
  return <I18nProvider value={value}>{children}</I18nProvider>;
}
