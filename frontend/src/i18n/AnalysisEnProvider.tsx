"use client";

import type { ReactNode } from "react";
import { AnalysisI18nProvider } from "./client";
import { analysis } from "./messages/en/analysis";
import { withPseudo } from "./pseudo";

const messages = withPseudo(analysis);

/** Pose les messages anglais de l'analyse. Posé par la page d'analyse anglaise. */
export function AnalysisEnProvider({ children }: { children: ReactNode }) {
  return <AnalysisI18nProvider value={messages}>{children}</AnalysisI18nProvider>;
}
