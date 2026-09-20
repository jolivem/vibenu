"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useLocationAnalysis } from "@/features/location-analysis/useLocationAnalysis";
import { useCardInsights } from "@/features/location-analysis/useCardInsights";
import { DVF_LAYER_ID, IRIS_LAYER_ID, SCHOOL_SECTOR_LAYER_ID, Map } from "@/components/map/Map";
import { LazyMap } from "@/components/map/LazyMap";
import { THEMATIC_BASEMAP } from "@/components/map/basemaps";
import { MobilityCard } from "@/components/analysis/MobilityCard";
import { RisksCard } from "@/components/analysis/RisksCard";
import { AirQualityCard } from "@/components/analysis/AirQualityCard";
import { RealEstateCard } from "@/components/analysis/RealEstateCard";
import { CadastreCard } from "@/components/analysis/CadastreCard";
import { NeighborhoodCard } from "@/components/analysis/NeighborhoodCard";
import { DemographicsCard } from "@/components/analysis/DemographicsCard";
import { PopulationScope } from "@/components/analysis/PopulationScope";
import { HistoryCard } from "@/components/analysis/HistoryCard";
import { HousingCard } from "@/components/analysis/HousingCard";
import { EmploymentCard } from "@/components/analysis/EmploymentCard";
import { HouseholdsCard } from "@/components/analysis/HouseholdsCard";
import { ElectionsCard } from "@/components/analysis/ElectionsCard";
import { ClimateCard } from "@/components/analysis/ClimateCard";
import { SchoolSectorCard } from "@/components/analysis/SchoolSectorCard";
import { CommuneEquipmentCard } from "@/components/analysis/CommuneEquipmentCard";
import { SecurityCard } from "@/components/analysis/SecurityCard";
import { MunicipalesCard } from "@/components/analysis/MunicipalesCard";
import { KeyFigures, type KeyFigure } from "@/components/analysis/KeyFigures";
import { buildKeyFigures } from "@/components/analysis/keyFiguresModel";
import { SectionNav } from "@/components/analysis/SectionNav";
import { ShareLinks } from "@/components/analysis/ShareLinks";
import { SECTION_ORDER, SECTION_TITLES, type SectionId } from "@/components/analysis/sections";
import { DownloadPdfButton } from "@/features/analysis-pdf/DownloadPdfButton";
import { Brand } from "@/components/Brand";
import { FEATURES } from "@/lib/site-features";
import { seoPageForCitycode } from "@/lib/commune-routing";

/** Couche d'aléa allumée d'office sur la carte des risques : la seule à couvrir tout le
 *  territoire avec un dégradé lisible. Les trois autres restent derrière leur case. */
const DEFAULT_RISK_LAYER = "risk-argile";

const LOCATOR_MAP_HEIGHT = "420px";
const THEMATIC_MAP_HEIGHT = "340px";
/** Plus haute que les cartes thématiques : c'est une carte qu'on regarde, pas qu'on lit. */
const HISTORY_MAP_HEIGHT = "420px";

function AnalysisSection({
  id,
  lead,
  children,
}: {
  id: SectionId;
  /**
   * En-tête de zone : le périmètre que les cards de la section décrivent, nommé une
   * seule fois au-dessus d'elles.
   *
   * Rendu comme premier élément du corps, et non entre le titre et lui : le corps est
   * un `flex column` à `gap: 20px`, donc l'en-tête est séparé de la première card par
   * exactement le même écart que deux cards entre elles, sans une ligne de CSS.
   */
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="page-section">
      <h2 className="page-section-title">{SECTION_TITLES[id]}</h2>
      <div className="page-section-body">
        {lead}
        {children}
      </div>
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

  // En PRO, on ne demande aucune synthèse : les sept cards concernées y sont toutes
  // désactivées, l'appel au modèle serait payé pour rien.
  const insightsInput = FEATURES.showCardInsights ? data ?? null : null;
  const {
    insights,
    securityRating,
    isLoading: insightsLoading,
    debugInput: insightsDebug,
  } = useCardInsights(insightsInput, citycode);

  // Le PDF ne capture qu'une carte : celle de localisation, la seule montée d'emblée.
  // Les trois cartes thématiques sont en montage différé — leur canvas peut ne pas exister.
  const mapRef = useRef<MapLibreMap | null>(null);
  const handleMapReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map;
  }, []);
  const getMap = useCallback(() => mapRef.current, []);

  const isCommune = data?.mode === "commune";
  // L'arrondissement analysé a aussi sa page commune SEO : on la propose, sans l'imposer.
  const seoPage = isCommune ? seoPageForCitycode(citycode) : undefined;

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
        (FEATURES.showSchoolSector && !!data.schoolSector) ||
        // En mode commune, les équipements de la commune entière remplacent le voisinage.
        (FEATURES.showCommuneEquipment && data.mode === "commune" && !!data.communeEquipment),
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

  /** Le sommaire ne connaît pas la taxonomie de l'analyse : on lui passe les titres. */
  const navSections = useMemo(
    () => activeSections.map((id) => ({ id, title: SECTION_TITLES[id] })),
    [activeSections],
  );

  /** Une tuile par section, chacune ancrant vers la sienne — calcul partagé avec l'en-tête
   *  de la fiche PDF (`buildKeyFigures`). */
  const keyFigures = useMemo<KeyFigure<SectionId>[]>(
    () => (data ? buildKeyFigures(data, securityRating, activeSections) : []),
    [data, activeSections, securityRating],
  );

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
                  insights={insights}
                  insightsLoading={insightsLoading}
                  securityRating={securityRating}
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
          {seoPage && (
            <Link href={`/commune/${seoPage.slug}`} className="analysis-hero-seo-link">
              Voir la page {seoPage.nomCourt} →
            </Link>
          )}
        </div>
      </div>

      <div className="page-shell">
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

            {FEATURES.showLocation && (
              <section className="card map-section page-locator">
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

            <div className="page-body">
              <aside className="page-sidebar">
                <SectionNav sections={navSections} />
              </aside>

              <div className="page-sections">
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
                      <NeighborhoodCard
                        neighborhood={data.neighborhood}
                        sectorSchool={FEATURES.showSchoolSector ? data.schoolSector : null}
                      />
                    )}
                    {FEATURES.showCommuneEquipment && isCommune && data.communeEquipment && (
                      <CommuneEquipmentCard equipment={data.communeEquipment} />
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

                {hasContent.securite && data.security && (
                  <AnalysisSection id="securite">
                    <SecurityCard
                      security={data.security}
                      codeInsee={citycode}
                      ville={data.address.city}
                      insight={insights.securite}
                    />
                  </AnalysisSection>
                )}

                {hasContent.population && (
                  <AnalysisSection
                    id="population"
                    // Gardé sur la donnée et non sur `showDemographics` : si un jour
                    // seule la card Logement était activée, c'est encore ce bandeau qui
                    // nommerait la zone qu'elle décrit.
                    lead={
                      data.demographics ? (
                        <PopulationScope demographics={data.demographics} mode={data.mode}>
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
                        </PopulationScope>
                      ) : null
                    }
                  >
                    {FEATURES.showDemographics && data.demographics && (
                      <DemographicsCard demographics={data.demographics} mode={data.mode} insight={insights.demographie} />
                    )}
                    {FEATURES.showEmployment && data.demographics && (
                      <EmploymentCard demographics={data.demographics} mode={data.mode} insight={insights.emploi} />
                    )}
                    {FEATURES.showHouseholds && data.demographics && (
                      <HouseholdsCard demographics={data.demographics} mode={data.mode} insight={insights.menages} />
                    )}
                    {FEATURES.showHousing && data.demographics && (
                      <HousingCard demographics={data.demographics} mode={data.mode} insight={insights.logement} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.elections && (
                  <AnalysisSection id="elections">
                    {FEATURES.showMunicipales && data.municipales && (
                      <MunicipalesCard municipales={data.municipales} insight={insights.municipales} />
                    )}
                    {FEATURES.showElections && data.elections && (
                      <ElectionsCard elections={data.elections} insight={insights.elections} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.environnement && (
                  <AnalysisSection id="environnement">
                    {FEATURES.showClimate && data.climate && <ClimateCard climate={data.climate} insight={insights.climat} />}
                    {FEATURES.showAirQuality && data.airQuality.available && (
                      <AirQualityCard airQuality={data.airQuality} />
                    )}
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
                          layerToggleHint="Cochez pour afficher les zones sur la carte."
                          height={THEMATIC_MAP_HEIGHT}
                        />
                      </LazyMap>
                    </RisksCard>
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

                {FEATURES.showCardInsights && (
                  <p className="analysis-ai-notice">
                    Les synthèses «&nbsp;En bref&nbsp;» sont rédigées par une intelligence
                    artificielle à partir des seules données affichées sur cette page. Les
                    chiffres et les sources qui les entourent, eux, proviennent directement
                    des fichiers publics cités.
                  </p>
                )}

                {insightsDebug !== undefined && (
                  <details className="card-insight-debug">
                    <summary>
                      Données envoyées au modèle (debug) — ~
                      {Math.round(JSON.stringify(insightsDebug).length / 4)} tokens
                    </summary>
                    <pre>{JSON.stringify(insightsDebug, null, 2)}</pre>
                  </details>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
