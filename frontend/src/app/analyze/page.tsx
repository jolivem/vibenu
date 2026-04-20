import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisScreen } from "@/components/analysis/AnalysisScreen";

export const metadata: Metadata = {
  title: "Analyse d'une adresse",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AnalyzePage() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <AnalysisScreen />
    </Suspense>
  );
}
