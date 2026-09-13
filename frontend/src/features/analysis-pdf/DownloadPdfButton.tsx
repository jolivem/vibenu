"use client";

import { useEffect, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type {
  CardInsights,
  LocationAnalysisDto,
  RealEstateAnalysisDto,
  SecurityRating,
} from "@/types/location-analysis";

interface Props {
  data: LocationAnalysisDto;
  realEstate: RealEstateAnalysisDto | null;
  insights: CardInsights;
  /**
   * Vrai tant que les « En bref » sont en cours de génération. Ils arrivent quelques
   * secondes après l'analyse : un PDF lancé dans l'intervalle sortait sans aucune
   * synthèse, `insights` valant encore `{}`.
   */
  insightsLoading?: boolean;
  /** Note de sécurité, rendue par le même appel que les « En bref ». */
  securityRating?: SecurityRating;
  getMap: () => MapLibreMap | null;
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "analyse";
}

export function DownloadPdfButton({
  data,
  realEstate,
  insights,
  insightsLoading = false,
  securityRating,
  getMap,
}: Props) {
  const [loading, setLoading] = useState(false);
  /** Clic reçu pendant la génération des « En bref » : le PDF part dès leur arrivée. */
  const [pending, setPending] = useState(false);

  function handleClick() {
    if (loading || pending) return;
    if (insightsLoading) {
      setPending(true);
      return;
    }
    void generate();
  }

  // Les « En bref » sont arrivés — ou leur génération a échoué, et le PDF part sans eux
  // plutôt que de rester bloqué. L'effet s'exécute après le rendu qui porte les nouvelles
  // `insights` : `generate` les lit donc à jour.
  useEffect(() => {
    if (pending && !insightsLoading) {
      setPending(false);
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, insightsLoading]);

  async function generate() {
    setLoading(true);
    try {
      const [{ pdf }, { AnalysisPdfDocument }, { captureMap }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./AnalysisPdfDocument"),
        import("./captureMap"),
      ]);

      const mapInstance = getMap();
      let mapDataUrl: string | null = null;
      if (mapInstance) {
        try {
          mapDataUrl = await captureMap(mapInstance);
        } catch {
          mapDataUrl = null;
        }
      }

      const blob = await pdf(
        <AnalysisPdfDocument
          data={data}
          realEstate={realEstate}
          securityRating={securityRating}
          pageUrl={window.location.href}
          mapDataUrl={mapDataUrl}
          insights={insights}
          generatedAt={new Date()}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fiche-${slugify(data.address.label)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="pdf-download-btn"
      onClick={handleClick}
      disabled={loading || pending}
    >
      {pending ? "Préparation des synthèses..." : loading ? "Génération..." : "Télécharger PDF"}
    </button>
  );
}
