"use client";

import { useSearchParams } from "next/navigation";
import { useLocationAnalysis } from "@/features/location-analysis/useLocationAnalysis";
import { Map } from "@/components/map/Map";
import { ScoreCard } from "@/components/score/ScoreCard";
import { SummaryCard } from "@/components/analysis/SummaryCard";
import { MobilityCard } from "@/components/analysis/MobilityCard";
import { RisksCard } from "@/components/analysis/RisksCard";
import { RealEstateCard } from "@/components/analysis/RealEstateCard";
import { CadastreCard } from "@/components/analysis/CadastreCard";

export function AnalysisScreen() {
  const searchParams = useSearchParams();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const label = searchParams.get("label") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const postcode = searchParams.get("postcode") ?? undefined;

  const { data, isLoading, error } = useLocationAnalysis({
    lat: lat ? Number(lat) : undefined,
    lon: lon ? Number(lon) : undefined,
    label,
    city,
    postcode,
  });

  return (
    <main className="analysis-page">
      <div className="analysis-header">
        <p className="eyebrow">Analyse BienVu</p>
        <h1>{label ?? "Adresse à analyser"}</h1>
      </div>

      {isLoading && <p>Analyse en cours...</p>}
      {error && <p>{error}</p>}

      {data && (
        <div className="analysis-grid">
          <div className="analysis-main">
            <Map
              lat={data.map.center.lat}
              lon={data.map.center.lon}
              label={data.address.label}
              transports={data.mobility.nearestStops.map((stop) => ({
                lat: data.map.center.lat,
                lon: data.map.center.lon,
                type: stop.mode,
                name: stop.name,
              }))}
              cadastreParcel={data.cadastre?.parcel}
            />
            <SummaryCard summary={data.summary} />
          </div>

          <aside className="analysis-side">
            <ScoreCard scores={data.scores} />
            <MobilityCard mobility={data.mobility} />
            <RisksCard risks={data.risks} />
            <RealEstateCard realEstate={data.realEstate} />
            {data.cadastre && <CadastreCard cadastre={data.cadastre} />}
          </aside>
        </div>
      )}
    </main>
  );
}
