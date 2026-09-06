"use client";

import { useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { CardInsights, LocationAnalysisDto, RealEstateAnalysisDto } from "@/types/location-analysis";

interface Props {
  data: LocationAnalysisDto;
  realEstate: RealEstateAnalysisDto | null;
  insights: CardInsights;
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

export function DownloadPdfButton({ data, realEstate, insights, getMap }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
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
          mapDataUrl={mapDataUrl}
          insights={insights}
          generatedAt={new Date()}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analyse-${slugify(data.address.label)}.pdf`;
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
      disabled={loading}
    >
      {loading ? "Génération..." : "Télécharger PDF"}
    </button>
  );
}
