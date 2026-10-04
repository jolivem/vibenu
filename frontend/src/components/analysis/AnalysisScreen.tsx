"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useLocationAnalysis } from "@/features/location-analysis/useLocationAnalysis";
import { useCardInsights } from "@/features/location-analysis/useCardInsights";
import { DVF_LAYER_ID, FLOOD_ZONES_LAYER_ID, IRIS_LAYER_ID, SCHOOL_SECTOR_LAYER_ID, Map } from "@/components/map/Map";
import { LazyMap } from "@/components/map/LazyMap";
import { THEMATIC_BASEMAP } from "@/components/map/basemaps";
import { MobilityCard } from "@/components/analysis/MobilityCard";
import { RisksCard } from "@/components/analysis/RisksCard";
import { AirQualityCard } from "@/components/analysis/AirQualityCard";
import { RealEstateCard } from "@/components/analysis/RealEstateCard";
import { CadastreCard } from "@/components/analysis/CadastreCard";
import { LocalTaxCard } from "@/components/analysis/LocalTaxCard";
import { hasLocalTaxContent } from "@/components/analysis/localTaxModel";
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
import { SECTION_ORDER, sectionTitles, type SectionId } from "@/components/analysis/sections";
import { DownloadPdfButton } from "@/features/analysis-pdf/DownloadPdfButton";
import { Brand } from "@/components/Brand";
import { FEATURES } from "@/lib/site-features";
import { seoPageForCitycode } from "@/lib/commune-routing";
import { useAnalysisI18n, useI18n } from "@/i18n/client";
import { localizedHref } from "@/i18n/locales";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/** Couche d'aléa allumée d'office quand il n'y a pas de zonage inondation à montrer : la
 *  seule à couvrir tout le territoire avec un dégradé lisible. Les autres restent derrière
 *  leur case. */
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
  const { sections } = useAnalysisI18n();
  const title = sectionTitles(sections, FEATURES.showAirQuality)[id];
  return (
    <section id={id} className="page-section">
      <h2 className="page-section-title">{title}</h2>
      <div className="page-section-body">
        {lead}
        {children}
      </div>
    </section>
  );
}

export function AnalysisScreen() {
  const searchParams = useSearchParams();
  const m = useAnalysisI18n();
  const { locale } = useI18n();
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
  } = useCardInsights(insightsInput, citycode, locale);

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
  // Un vrai zonage d'inondation, et pas seulement le périmètre d'un plan.
  const hasFloodZoning = !!data?.risks.floodZones?.some((zone) => zone.kind !== "perimeter");

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
        (FEATURES.showRealEstate && !!data.realEstate) ||
        (FEATURES.showLocalTax && hasLocalTaxContent(data.localTax)) ||
        (FEATURES.showCadastre && !!data.cadastre),
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
    () => {
      const titles = sectionTitles(m.sections, FEATURES.showAirQuality);
      return activeSections.map((id) => ({ id, title: titles[id] }));
    },
    [activeSections, m],
  );

  /** Une tuile par section, chacune ancrant vers la sienne — calcul partagé avec l'en-tête
   *  de la fiche PDF (`buildKeyFigures`). */
  const keyFigures = useMemo<KeyFigure<SectionId>[]>(
    () => (data ? buildKeyFigures(data, securityRating, activeSections, m.keyFigures) : []),
    [data, activeSections, securityRating, m],
  );

  return (
    <main id="haut" className="analysis-layout">
      <header className="analysis-topbar">
        <div className="analysis-topbar-inner">
          <Link href={localizedHref(locale, "home")} className="analysis-back">
            <span aria-hidden>←</span>
            <span className="analysis-brand">
              <Brand />
            </span>
          </Link>
          <div className="analysis-actions">
            <LanguageSwitcher route="analyze" className="analysis-language" />
          {data && (
            <>
              {FEATURES.hasShareLinks && <ShareLinks label={data.address.label} m={m.screen.share} />}
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
            </>
          )}
          </div>
        </div>
      </header>

      <div className="analysis-hero-strip">
        <div className="analysis-hero-inner">
          <p className="analysis-hero-eyebrow">
            {m.screen.eyebrow(city, postcode)}
          </p>
          <h1 className="analysis-hero-title">{label ?? m.screen.titleFallback}</h1>
          {seoPage && (
            <Link href={`/commune/${seoPage.slug}`} hrefLang="fr" className="analysis-hero-seo-link">
              {m.screen.communePageLink(seoPage.nomCourt)}
            </Link>
          )}
        </div>
      </div>

      <div className="page-shell">
        {isLoading && (
          <div className="analysis-loader">
            <div className="spinner" />
            <p>{m.screen.loading}</p>
          </div>
        )}
        {error && <p className="analysis-error">{m.screen.failed}</p>}

        {data && (
          <>
            <KeyFigures figures={keyFigures} ariaLabel={m.keyFigures.ariaLabel} />

            {FEATURES.showLocation && (
              <section className="card map-section page-locator">
                <h2>{m.screen.locationTitle}</h2>
                <Map
                  lat={data.map.center.lat}
                  lon={data.map.center.lon}
                  label={data.address.label}
                  cadastreParcel={data.cadastre?.parcel}
                  communeContour={data.map.communeContour}
                  showLayerToggle={false}
                  showBaseLayers
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
                      <RealEstateCard realEstate={realEstate} m={m.realEstate}>
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
                    {FEATURES.showLocalTax && hasLocalTaxContent(data.localTax) && (
                      <LocalTaxCard localTax={data.localTax} m={m.localTax} insight={insights.fiscalite} />
                    )}
                    {FEATURES.showCadastre && data.cadastre && (
                      <CadastreCard cadastre={data.cadastre} m={m.cadastre} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.proximite && (
                  <AnalysisSection id="proximite">
                    {FEATURES.showNeighborhood && !isCommune && (
                      <NeighborhoodCard
                        neighborhood={data.neighborhood}
                        m={m.nearby}
                        sectorSchool={FEATURES.showSchoolSector ? data.schoolSector : null}
                      />
                    )}
                    {FEATURES.showCommuneEquipment && isCommune && data.communeEquipment && (
                      <CommuneEquipmentCard equipment={data.communeEquipment} m={m.nearby.communeEquipment} />
                    )}
                    {FEATURES.showSchoolSector && data.schoolSector && (
                      <SchoolSectorCard schoolSector={data.schoolSector} m={m.nearby.school}>
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
                    <MobilityCard mobility={data.mobility} mode={data.mode} m={m.mobility} nearby={m.nearby} />
                  </AnalysisSection>
                )}

                {hasContent.securite && data.security && (
                  <AnalysisSection id="securite">
                    <SecurityCard
                      security={data.security}
                      codeInsee={citycode}
                      ville={data.address.city}
                      m={m.security}
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
                        <PopulationScope demographics={data.demographics} mode={data.mode} m={m.population}>
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
                      <DemographicsCard demographics={data.demographics} mode={data.mode} m={m.population} insight={insights.demographie} />
                    )}
                    {FEATURES.showEmployment && data.demographics && (
                      <EmploymentCard demographics={data.demographics} mode={data.mode} m={m.population} insight={insights.emploi} />
                    )}
                    {FEATURES.showHouseholds && data.demographics && (
                      <HouseholdsCard demographics={data.demographics} mode={data.mode} m={m.population} insight={insights.menages} />
                    )}
                    {FEATURES.showHousing && data.demographics && (
                      <HousingCard demographics={data.demographics} mode={data.mode} m={m.population} insight={insights.logement} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.elections && (
                  <AnalysisSection id="elections">
                    {FEATURES.showMunicipales && data.municipales && (
                      <MunicipalesCard municipales={data.municipales} m={m.elections} insight={insights.municipales} />
                    )}
                    {FEATURES.showElections && data.elections && (
                      <ElectionsCard elections={data.elections} m={m.elections} insight={insights.elections} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.environnement && (
                  <AnalysisSection id="environnement">
                    {FEATURES.showClimate && data.climate && <ClimateCard climate={data.climate} m={m.climate} insight={insights.climat} />}
                    {FEATURES.showAirQuality && data.airQuality.available && (
                      <AirQualityCard airQuality={data.airQuality} m={m.air} />
                    )}
                  </AnalysisSection>
                )}

                {hasContent.risques && (
                  <AnalysisSection id="risques">
                    <RisksCard risks={data.risks} m={m.risks}>
                      <LazyMap height={THEMATIC_MAP_HEIGHT}>
                        <Map
                          lat={data.map.center.lat}
                          lon={data.map.center.lon}
                          label={data.address.label}
                          risks={data.risks}
                          floodZones={data.risks.floodZones}
                          communeContour={data.map.communeContour}
                          basemap={THEMATIC_BASEMAP}
                          // Le zonage inondation passe devant l'argile quand il existe :
                          // c'est l'aléa le plus localisé, donc le plus informatif. Deux
                          // aplats superposés se mélangeraient en bouillie, d'où l'un ou
                          // l'autre et non les deux. Un simple périmètre de PPR ne dit
                          // rien du lieu : il ne prend pas la place de l'argile.
                          initialLayers={
                            hasFloodZoning ? [FLOOD_ZONES_LAYER_ID] : [DEFAULT_RISK_LAYER]
                          }
                          layerToggleHint={
                            hasFloodZoning
                              ? m.screen.floodHint.zoning
                              : data.risks.floodZones?.length
                                ? m.screen.floodHint.perimeterOnly
                                : m.screen.floodHint.none
                          }
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
                      title={m.screen.historyTitle}
                    />
                  </AnalysisSection>
                )}

                {FEATURES.showCardInsights && (
                  <p className="analysis-ai-notice">{m.screen.aiNotice}</p>
                )}

                {insightsDebug !== undefined && (
                  <details className="card-insight-debug">
                    <summary>
                      {m.screen.debugSummary(Math.round(JSON.stringify(insightsDebug).length / 4))}
                    </summary>
                    <pre>{JSON.stringify(insightsDebug, null, 2)}</pre>
                  </details>
                )}

                <a href="#haut" className="analysis-back-to-top">
                  <span aria-hidden>↑</span> {m.screen.backToTop}
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
