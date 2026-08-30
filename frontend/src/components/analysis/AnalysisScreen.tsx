"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useLocationAnalysis } from "@/features/location-analysis/useLocationAnalysis";
import { useNarrative } from "@/features/location-analysis/useNarrative";
import { DVF_LAYER_ID, IRIS_LAYER_ID, SCHOOL_SECTOR_LAYER_ID, Map } from "@/components/map/Map";
import { LazyMap } from "@/components/map/LazyMap";
import { THEMATIC_BASEMAP } from "@/components/map/basemaps";
import { NarrativeCard } from "@/components/analysis/NarrativeCard";
import { MobilityCard } from "@/components/analysis/MobilityCard";
import { RisksCard } from "@/components/analysis/RisksCard";
import { AirQualityCard, LEVEL_CONFIG as AIR_QUALITY_LEVELS } from "@/components/analysis/AirQualityCard";
import { RealEstateCard } from "@/components/analysis/RealEstateCard";
import { CadastreCard } from "@/components/analysis/CadastreCard";
import { NeighborhoodCard } from "@/components/analysis/NeighborhoodCard";
import { DemographicsCard } from "@/components/analysis/DemographicsCard";
import { HistoryCard } from "@/components/analysis/HistoryCard";
import { HousingCard } from "@/components/analysis/HousingCard";
import { EmploymentCard } from "@/components/analysis/EmploymentCard";
import { HouseholdsCard } from "@/components/analysis/HouseholdsCard";
import { ElectionsCard } from "@/components/analysis/ElectionsCard";
import { ClimateCard } from "@/components/analysis/ClimateCard";
import { SchoolSectorCard } from "@/components/analysis/SchoolSectorCard";
import { SecurityCard } from "@/components/analysis/SecurityCard";
import { MunicipalesCard } from "@/components/analysis/MunicipalesCard";
import { KeyFigures, type KeyFigure } from "@/components/analysis/KeyFigures";
import { SectionNav } from "@/components/analysis/SectionNav";
import { ShareLinks } from "@/components/analysis/ShareLinks";
import { SECTION_ORDER, SECTION_TITLES, type SectionId } from "@/components/analysis/sections";
import { formatRevenu } from "@/components/analysis/demographicsFormat";
import { DownloadPdfButton } from "@/features/analysis-pdf/DownloadPdfButton";
import { Brand } from "@/components/Brand";
import { formatFr } from "@/lib/format";
import { FEATURES } from "@/lib/site-features";

/** Couche d'aléa allumée d'office sur la carte des risques : la seule à couvrir tout le
 *  territoire avec un dégradé lisible. Les trois autres restent derrière leur case. */
const DEFAULT_RISK_LAYER = "risk-argile";

/** Rayon retenu pour « à moins de 10 min à pied », à 75 m/min — la vitesse de marche
 *  déjà utilisée pour afficher les temps de trajet des POI. */
const TEN_MINUTES_WALK_METERS = 750;

const LOCATOR_MAP_HEIGHT = "420px";
const THEMATIC_MAP_HEIGHT = "340px";
/** Plus haute que les cartes thématiques : c'est une carte qu'on regarde, pas qu'on lit. */
const HISTORY_MAP_HEIGHT = "420px";

/** Les niveaux du DTO sont en minuscules (« très bon », « modéré ») : ils se lisent au fil
 *  d'une phrase dans les cards, mais isolés dans une tuile ils veulent une capitale. */
function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function AnalysisSection({ id, children }: { id: SectionId; children: ReactNode }) {
  return (
    <section id={id} className="analysis-section">
      <h2 className="analysis-section-title">{SECTION_TITLES[id]}</h2>
      <div className="analysis-section-body">{children}</div>
    </section>
  );
}

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

  // En PRO, on ne fetch pas la narrative (économise des tokens Mistral inutiles
  // puisque la card ne sera de toute façon pas affichée).
  const narrativeInput = FEATURES.showNarrative ? data ?? null : null;
  const { narrative, isLoading: narrativeLoading, error: narrativeError } = useNarrative(narrativeInput);

  // Le PDF ne capture qu'une carte : celle de localisation, la seule montée d'emblée.
  // Les trois cartes thématiques sont en montage différé — leur canvas peut ne pas exister.
  const mapRef = useRef<MapLibreMap | null>(null);
  const handleMapReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map;
  }, []);
  const getMap = useCallback(() => mapRef.current, []);

  const isCommune = data?.mode === "commune";

  /**
   * Une section n'est rendue que si elle a du contenu. Deux cas la vident :
   * la variante PRO, qui coupe la plupart des cards, et le mode commune, où « À proximité »
   * n'a rien à montrer (les POI sont mesurés depuis le centroïde). Une section vide
   * disparaît alors du corps de la page, du sommaire et du bandeau — plutôt que d'afficher
   * un titre suivi de rien.
   */
  const hasContent = useMemo<Record<SectionId, boolean>>(() => {
    if (!data) {
      return {
        immobilier: false,
        deplacer: false,
        proximite: false,
        environnement: false,
        securite: false,
        risques: false,
        population: false,
        elections: false,
        histoire: false,
      };
    }
    return {
      immobilier:
        (FEATURES.showRealEstate && !!data.realEstate) || (FEATURES.showCadastre && !!data.cadastre),
      deplacer: FEATURES.showMobility,
      proximite:
        (FEATURES.showNeighborhood && data.mode !== "commune") ||
        (FEATURES.showSchoolSector && !!data.schoolSector),
      environnement:
        (FEATURES.showAirQuality && data.airQuality.available) ||
        (FEATURES.showClimate && !!data.climate),
      securite: FEATURES.showSecurity && !!data.security,
      risques: FEATURES.showRisks,
      population:
        (FEATURES.showDemographics && !!data.demographics) ||
        (FEATURES.showHousing && !!data.demographics?.housing) ||
        (FEATURES.showEmployment && !!data.demographics?.employment) ||
        (FEATURES.showHouseholds && !!data.demographics?.households),
      elections:
        (FEATURES.showElections && !!data.elections) ||
        (FEATURES.showMunicipales && !!data.municipales),
      // Seule section sans condition sur la donnée : elle ne consomme rien du serveur,
      // les cartes anciennes viennent directement de la Géoplateforme IGN.
      histoire: FEATURES.showHistory,
    };
  }, [data]);

  const activeSections = useMemo(
    () => SECTION_ORDER.filter((id) => hasContent[id]),
    [hasContent],
  );

  /** Une tuile par section, chacune ancrant vers la sienne : le bandeau est un miroir du
   *  sommaire. Une section sans chiffre disponible n'a pas de tuile, et le bandeau se
   *  resserre — il ne reste pas de trou. */
  const keyFigures = useMemo<KeyFigure[]>(() => {
    if (!data) return [];

    const figures: Partial<Record<SectionId, KeyFigure>> = {};

    const medianPrice = data.realEstate?.medianPricePerSquareMeter;
    if (medianPrice != null) {
      figures.immobilier = {
        section: "immobilier",
        label: "Prix médian",
        value: `${formatFr(Math.round(medianPrice))} €/m²`,
      };
    }

    figures.deplacer = {
      section: "deplacer",
      label: "Transports",
      value: capitalizeFirst(data.mobility.label),
    };

    if (data.mode !== "commune") {
      const nearby = data.neighborhood.pois.filter(
        (poi) => poi.distanceMeters <= TEN_MINUTES_WALK_METERS,
      ).length;
      figures.proximite = {
        section: "proximite",
        label: "À moins de 10 min",
        value: `${nearby} service${nearby > 1 ? "s" : ""}`,
      };
    }

    if (data.airQuality.available && data.airQuality.level) {
      figures.environnement = {
        section: "environnement",
        label: "Qualité de l'air",
        value: AIR_QUALITY_LEVELS[data.airQuality.level].label,
      };
    }

    figures.risques = {
      section: "risques",
      label: "Risques",
      value: capitalizeFirst(data.risks.level),
    };

    if (data.demographics?.revenuMedian != null) {
      figures.population = {
        section: "population",
        label: "Revenu médian",
        value: formatRevenu(data.demographics.revenuMedian),
      };
    }

    return activeSections
      .map((id) => figures[id])
      .filter((figure): figure is KeyFigure => figure !== undefined);
  }, [data, activeSections]);

  return (
    <main className="analysis-layout">
      <header className="analysis-topbar">
        <div className="analysis-topbar-inner">
          <Link href="/" className="analysis-back">
            <span aria-hidden>←</span>
            <span className="analysis-brand">
              <Brand />
            </span>
          </Link>
          {data && (
            <div className="analysis-actions">
              {FEATURES.hasShareLinks && <ShareLinks label={data.address.label} />}
              {FEATURES.hasPdfExport && (
                <DownloadPdfButton
                  data={data}
                  realEstate={realEstate ?? null}
                  narrativeParagraph={narrative?.paragraph ?? null}
                  getMap={getMap}
                />
              )}
            </div>
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
          <>
            <KeyFigures figures={keyFigures} />

            {FEATURES.showNarrative && (
              <NarrativeCard
                narrative={narrative}
                isLoading={narrativeLoading}
                error={narrativeError}
              />
            )}

            {FEATURES.showLocation && (
              <section className="card map-section analysis-locator">
                <h2>Localisation</h2>
                <Map
                  lat={data.map.center.lat}
                  lon={data.map.center.lon}
                  label={data.address.label}
                  cadastreParcel={data.cadastre?.parcel}
                  communeContour={data.map.communeContour}
                  showLayerToggle={false}
                  height={LOCATOR_MAP_HEIGHT}
                  onReady={handleMapReady}
                />
              </section>
            )}

            <div className="analysis-body">
              <aside className="analysis-sidebar">
                <SectionNav sections={activeSections} />
              </aside>

              <div className="analysis-sections">
                {hasContent.immobilier && (
                  <AnalysisSection id="immobilier">
                    {FEATURES.showRealEstate && realEstate && (
                      <RealEstateCard realEstate={realEstate}>
                        {realEstate.transactionFeatures?.length ? (
                          <LazyMap height={THEMATIC_MAP_HEIGHT}>
                            <Map
                              lat={data.map.center.lat}
                              lon={data.map.center.lon}
                              label={data.address.label}
                              dvfTransactions={realEstate.transactionFeatures}
                              communeContour={data.map.communeContour}
                              basemap={THEMATIC_BASEMAP}
                              initialLayers={[DVF_LAYER_ID]}
                              showLayerToggle={false}
                              height={THEMATIC_MAP_HEIGHT}
                            />
                          </LazyMap>
                        ) : null}
                      </RealEstateCard>
                    )}
                    {FEATURES.showCadastre && data.cadastre && (
                      <CadastreCard cadastre={data.cadastre} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.proximite && (
                  <AnalysisSection id="proximite">
                    {FEATURES.showNeighborhood && !isCommune && (
                      <NeighborhoodCard neighborhood={data.neighborhood} />
                    )}
                    {FEATURES.showSchoolSector && data.schoolSector && (
                      <SchoolSectorCard schoolSector={data.schoolSector}>
                        {data.schoolSector.geometry ? (
                          <LazyMap height={THEMATIC_MAP_HEIGHT}>
                            <Map
                              lat={data.map.center.lat}
                              lon={data.map.center.lon}
                              label={data.address.label}
                              schoolSector={data.schoolSector.geometry}
                              basemap={THEMATIC_BASEMAP}
                              initialLayers={[SCHOOL_SECTOR_LAYER_ID]}
                              showLayerToggle={false}
                              height={THEMATIC_MAP_HEIGHT}
                            />
                          </LazyMap>
                        ) : null}
                      </SchoolSectorCard>
                    )}
                  </AnalysisSection>
                )}

                {hasContent.deplacer && (
                  <AnalysisSection id="deplacer">
                    <MobilityCard mobility={data.mobility} mode={data.mode} />
                  </AnalysisSection>
                )}

                {hasContent.environnement && (
                  <AnalysisSection id="environnement">
                    {FEATURES.showClimate && data.climate && <ClimateCard climate={data.climate} />}
                    {FEATURES.showAirQuality && data.airQuality.available && (
                      <AirQualityCard airQuality={data.airQuality} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.securite && data.security && (
                  <AnalysisSection id="securite">
                    <SecurityCard
                      security={data.security}
                      codeInsee={citycode}
                      ville={data.address.city}
                    />
                  </AnalysisSection>
                )}

                {hasContent.risques && (
                  <AnalysisSection id="risques">
                    <RisksCard risks={data.risks}>
                      <LazyMap height={THEMATIC_MAP_HEIGHT}>
                        <Map
                          lat={data.map.center.lat}
                          lon={data.map.center.lon}
                          label={data.address.label}
                          risks={data.risks}
                          communeContour={data.map.communeContour}
                          basemap={THEMATIC_BASEMAP}
                          initialLayers={[DEFAULT_RISK_LAYER]}
                          height={THEMATIC_MAP_HEIGHT}
                        />
                      </LazyMap>
                    </RisksCard>
                  </AnalysisSection>
                )}

                {hasContent.population && (
                  <AnalysisSection id="population">
                    {FEATURES.showDemographics && data.demographics && (
                      <DemographicsCard demographics={data.demographics} mode={data.mode}>
                        {!isCommune && data.demographics.irisGeojson ? (
                          <LazyMap height={THEMATIC_MAP_HEIGHT}>
                            <Map
                              lat={data.map.center.lat}
                              lon={data.map.center.lon}
                              label={data.address.label}
                              irisGeojson={data.demographics.irisGeojson}
                              basemap={THEMATIC_BASEMAP}
                              initialLayers={[IRIS_LAYER_ID]}
                              showLayerToggle={false}
                              height={THEMATIC_MAP_HEIGHT}
                            />
                          </LazyMap>
                        ) : null}
                      </DemographicsCard>
                    )}
                    {FEATURES.showHousing && data.demographics && (
                      <HousingCard demographics={data.demographics} mode={data.mode} />
                    )}
                    {FEATURES.showEmployment && data.demographics && (
                      <EmploymentCard demographics={data.demographics} mode={data.mode} />
                    )}
                    {FEATURES.showHouseholds && data.demographics && (
                      <HouseholdsCard demographics={data.demographics} mode={data.mode} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.elections && (
                  <AnalysisSection id="elections">
                    {FEATURES.showMunicipales && data.municipales && (
                      <MunicipalesCard municipales={data.municipales} />
                    )}
                    {FEATURES.showElections && data.elections && (
                      <ElectionsCard elections={data.elections} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.histoire && (
                  <AnalysisSection id="histoire">
                    <HistoryCard
                      lat={data.map.center.lat}
                      lon={data.map.center.lon}
                      label={data.address.label}
                      mode={data.mode}
                      cadastreParcel={data.cadastre?.parcel ?? null}
                      communeContour={data.map.communeContour ?? null}
                      height={HISTORY_MAP_HEIGHT}
                    />
                  </AnalysisSection>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
