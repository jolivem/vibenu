import { Suspense } from "react";
import { AnalysisScreen } from "@/components/analysis/AnalysisScreen";

export default function AnalyzePage() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <AnalysisScreen />
    </Suspense>
  );
}
