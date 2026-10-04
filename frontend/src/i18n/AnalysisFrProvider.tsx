"use client";

import type { ReactNode } from "react";
import { AnalysisI18nProvider } from "./client";
import { analysis } from "./messages/fr/analysis";
import { withPseudo } from "./pseudo";

const messages = withPseudo(analysis);

/** Pose les messages français de l'analyse. Posé par la page d'analyse française. */
export function AnalysisFrProvider({ children }: { children: ReactNode }) {
  return <AnalysisI18nProvider value={messages}>{children}</AnalysisI18nProvider>;
}
