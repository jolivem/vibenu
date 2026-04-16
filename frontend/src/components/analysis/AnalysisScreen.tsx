"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocationAnalysis } from "@/features/location-analysis/useLocationAnalysis";
import { Map } from "@/components/map/Map";
import { SummaryCard } from "@/components/analysis/SummaryCard";
import { MobilityCard } from "@/components/analysis/MobilityCard";
import { RisksCard } from "@/components/analysis/RisksCard";
import { RealEstateCard } from "@/components/analysis/RealEstateCard";
import { CadastreCard } from "@/components/analysis/CadastreCard";
import { NeighborhoodCard } from "@/components/analysis/NeighborhoodCard";
import { DemographicsCard } from "@/components/analysis/DemographicsCard";

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
    <main className="analysis-layout">
      <header className="analysis-topbar">
        <div className="analysis-topbar-inner">
          <Link href="/" className="analysis-back">
            &larr; <span className="analysis-brand">BienVu</span>
          </Link>
        </div>
      </header>

      <div className="analysis-hero-strip">
        <div className="analysis-hero-inner">
          <p className="analysis-hero-eyebrow">Analyse</p>
          <h1 className="analysis-hero-title">{label ?? "Adresse à analyser"}</h1>
        </div>
      </div>

      <div className="analysis-page">
        {isLoading && (
          <div className="analysis-loader">
            <div className="spinner" />
            <p>Analyse en cours...</p>
          </div>
        )}
        {error && <p className="analysis-error">{error}</p>}

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
                dvfTransactions={data.realEstate.transactionFeatures}
                irisGeojson={data.demographics?.irisGeojson}
              />
              <SummaryCard summary={data.summary} />
            </div>

            <aside className="analysis-side">
              <MobilityCard mobility={data.mobility} />
              <RisksCard risks={data.risks} />
              <RealEstateCard realEstate={data.realEstate} />
              <NeighborhoodCard neighborhood={data.neighborhood} />
              {data.demographics && <DemographicsCard demographics={data.demographics} />}
              {data.cadastre && <CadastreCard cadastre={data.cadastre} />}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
