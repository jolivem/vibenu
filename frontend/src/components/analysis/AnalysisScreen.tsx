"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useLocationAnalysis } from "@/features/location-analysis/useLocationAnalysis";
import { useNarrative } from "@/features/location-analysis/useNarrative";
import { Map } from "@/components/map/Map";
import { NarrativeCard } from "@/components/analysis/NarrativeCard";
import { MobilityCard } from "@/components/analysis/MobilityCard";
import { RisksCard } from "@/components/analysis/RisksCard";
import { AirQualityCard } from "@/components/analysis/AirQualityCard";
import { RealEstateCard } from "@/components/analysis/RealEstateCard";
import { CadastreCard } from "@/components/analysis/CadastreCard";
import { NeighborhoodCard } from "@/components/analysis/NeighborhoodCard";
import { DemographicsCard } from "@/components/analysis/DemographicsCard";
import { ElectionsCard } from "@/components/analysis/ElectionsCard";
import { ClimateCard } from "@/components/analysis/ClimateCard";
import { DownloadPdfButton } from "@/features/analysis-pdf/DownloadPdfButton";

export function AnalysisScreen() {
  const searchParams = useSearchParams();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const label = searchParams.get("label") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const postcode = searchParams.get("postcode") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const citycode = searchParams.get("citycode") ?? undefined;

  const latNum = lat ? Number(lat) : undefined;
  const lonNum = lon ? Number(lon) : undefined;

  const { data, isLoading, error } = useLocationAnalysis({
    lat: latNum,
    lon: lonNum,
    label,
    city,
    postcode,
    type,
    citycode,
  });

  const realEstate = data?.realEstate;

  const { narrative, isLoading: narrativeLoading, error: narrativeError } = useNarrative(data ?? null);

  const mapRef = useRef<MapLibreMap | null>(null);
  const handleMapReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map;
  }, []);
  const getMap = useCallback(() => mapRef.current, []);

  return (
    <main className="analysis-layout">
      <header className="analysis-topbar">
        <div className="analysis-topbar-inner">
          <Link href="/" className="analysis-back">
            <span aria-hidden>←</span>
            <span className="analysis-brand">
              Claire<span>Adresse</span>
            </span>
          </Link>
          {data && (
            <DownloadPdfButton
              data={data}
              realEstate={realEstate ?? null}
              narrativeParagraph={narrative?.paragraph ?? null}
              getMap={getMap}
            />
          )}
        </div>
      </header>

      <div className="analysis-hero-strip">
        <div className="analysis-hero-inner">
          <p className="analysis-hero-eyebrow">
            Analyse{city ? ` · ${city}` : ""}{postcode ? ` · ${postcode}` : ""}
          </p>
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
            <section className="card map-section">
              <h2>Localisation</h2>
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
                communeContour={data.map.communeContour}
                risks={data.risks}
                onReady={handleMapReady}
              />
            </section>
            <NarrativeCard
              narrative={narrative}
              isLoading={narrativeLoading}
              error={narrativeError}
            />
            <div className="analysis-pair">
              <div className="analysis-stack">
                <MobilityCard mobility={data.mobility} mode={data.mode} />
                {realEstate && <RealEstateCard realEstate={realEstate} />}
              </div>
              <div className="analysis-stack">
                <RisksCard risks={data.risks} />
                <AirQualityCard airQuality={data.airQuality} />
              </div>
            </div>
            {data.mode !== "commune" && <NeighborhoodCard neighborhood={data.neighborhood} />}
            {data.demographics && <DemographicsCard demographics={data.demographics} />}
            {data.climate && <ClimateCard climate={data.climate} />}
            {data.elections && <ElectionsCard elections={data.elections} />}
            {data.cadastre && <CadastreCard cadastre={data.cadastre} />}
          </div>
        )}
      </div>
    </main>
  );
}
