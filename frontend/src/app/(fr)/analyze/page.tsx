import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisScreen } from "@/components/analysis/AnalysisScreen";
import { AnalysisFrProvider } from "@/i18n/AnalysisFrProvider";
import { screen } from "@/i18n/messages/fr/analysis/screen";
import { common } from "@/i18n/messages/fr/common";

export const metadata: Metadata = {
  title: screen.metaTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AnalyzePage() {
  return (
    <Suspense fallback={<p>{common.loading}</p>}>
      <AnalysisFrProvider>
        <AnalysisScreen />
      </AnalysisFrProvider>
    </Suspense>
  );
}
