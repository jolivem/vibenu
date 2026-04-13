"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocationAnalysis } from "@/features/location-analysis/useLocationAnalysis";
import { useDvfRealEstate } from "@/features/location-analysis/useDvfRealEstate";
import { Map } from "@/components/map/Map";
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

  const parsedLat = lat ? Number(lat) : undefined;
  const parsedLon = lon ? Number(lon) : undefined;

  const { data, isLoading, error } = useLocationAnalysis({
    lat: parsedLat,
    lon: parsedLon,
    label,
    city,
    postcode,
  });

  const { dvfData, dvfLoading } = useDvfRealEstate(parsedLat, parsedLon);

  const realEstate = dvfData ?? data?.realEstate;

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
          <h1 className="analysis-hero-title">{label ?? "Adresse \u00e0 analyser"}</h1>
        </div>
      </div>

      <div className="analysis-page">
        {isLoading && <p className="analysis-loading">Analyse en cours...</p>}
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
                dvfTransactions={realEstate?.transactionFeatures}
              />
              <SummaryCard summary={data.summary} />
            </div>

            <aside className="analysis-side">
              <MobilityCard mobility={data.mobility} />
              <RisksCard risks={data.risks} />
              {realEstate && !dvfLoading && (
                <RealEstateCard realEstate={realEstate} />
              )}
              {dvfLoading && <p className="analysis-loading">Chargement des prix...</p>}
              {data.cadastre && <CadastreCard cadastre={data.cadastre} />}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
