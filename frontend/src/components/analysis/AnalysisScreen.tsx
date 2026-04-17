"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocationAnalysis } from "@/features/location-analysis/useLocationAnalysis";
import { useDvfRealEstate } from "@/features/location-analysis/useDvfRealEstate";
import { env } from "@/lib/config/env";
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

  const latNum = lat ? Number(lat) : undefined;
  const lonNum = lon ? Number(lon) : undefined;

  const { data, isLoading, error } = useLocationAnalysis({
    lat: latNum,
    lon: lonNum,
    label,
    city,
    postcode,
  });

  const useCerema = env.dvfSource === "cerema";
  const { dvfData, dvfLoading, dvfError } = useDvfRealEstate(
    useCerema ? latNum : undefined,
    useCerema ? lonNum : undefined,
  );

  const realEstate =
    useCerema && dvfData && data ? dvfData : data?.realEstate;

  return (
    <main className="analysis-layout">
      <header className="analysis-topbar">
        <div className="analysis-topbar-inner">
          <Link href="/" className="analysis-back">
            &larr; <span className="analysis-brand">ClairImmo</span>
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
                dvfTransactions={realEstate?.transactionFeatures}
                irisGeojson={data.demographics?.irisGeojson}
              />
              <SummaryCard summary={data.summary} />
            </div>

            <aside className="analysis-side">
              <MobilityCard mobility={data.mobility} />
              <RisksCard risks={data.risks} />
              {realEstate && (
                <RealEstateCard
                  realEstate={realEstate}
                  loading={useCerema && dvfLoading}
                  error={useCerema && dvfError}
                />
              )}
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
