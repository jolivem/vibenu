import { createContext, useContext } from "react";
import type { AnalysisMessages } from "@/i18n/messages/fr/analysis";

/**
 * Les messages de la fiche PDF, pour tout l'arbre `@react-pdf/renderer`.
 *
 * Le contexte du DOM ne traverse pas `pdf(<Document />)` : le document est rendu par un
 * autre moteur. `DownloadPdfButton` lit donc la langue de la page et la repose ici, par
 * `AnalysisPdfDocument`.
 */
const PdfMessagesContext = createContext<AnalysisMessages | null>(null);

export const PdfMessagesProvider = PdfMessagesContext.Provider;

export function usePdfMessages(): AnalysisMessages {
  const value = useContext(PdfMessagesContext);
  if (!value) throw new Error("usePdfMessages : la fiche PDF est rendue sans ses messages.");
  return value;
}
