import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisScreen } from "@/components/analysis/AnalysisScreen";
import { AnalysisEnProvider } from "@/i18n/AnalysisEnProvider";
import { screen } from "@/i18n/messages/en/analysis/screen";
import { common } from "@/i18n/messages/en/common";

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
      <AnalysisEnProvider>
        <AnalysisScreen />
      </AnalysisEnProvider>
    </Suspense>
  );
}
