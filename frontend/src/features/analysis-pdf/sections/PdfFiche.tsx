import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type {
  AirQualityAnalysisDto,
  AnalysisMode,
  CadastreAnalysisDto,
  CardInsights,
  ClimateAnalysisDto,
  CommuneEquipmentDto,
  DemographicsAnalysisDto,
  ElectionsAnalysisDto,
  LocalTaxAnalysisDto,
  MobilityAnalysisDto,
  MunicipalesAnalysisDto,
  NeighborhoodAnalysisDto,
  RealEstateAnalysisDto,
  RiskAnalysisDto,
  SchoolSectorDto,
} from "@/types/location-analysis";
import { modalLevel } from "@/components/analysis/airQualityModel";
import type { ClimateMetric } from "@/components/analysis/climateChart";
import { climateTitle } from "@/components/analysis/climateFormat";
import {
  absentLine,
  familyTitle,
  rubricLabel,
  equipmentFootnote,
  equipmentLine,
  splitRubrics,
} from "@/components/analysis/communeEquipmentFormat";
import { compactIndicator } from "@/components/analysis/indicator";
import { viewForMode } from "@/components/analysis/inseeChart";
import { localTaxFacts } from "@/components/analysis/localTaxModel";
import type { KeyFigure } from "@/components/analysis/KeyFigures";
import { mobilityView } from "@/components/analysis/mobilityModel";
import { familyCounts, groupByCategory, presentFamilies, poiName } from "@/components/analysis/neighborhoodModel";
import { pluZoneLongLabel, pluZoneType } from "@/components/analysis/pluZone";
import {
  DEMOGRAPHICS_INDICATORS,
  EMPLOYMENT_INDICATORS,
  HOUSEHOLDS_INDICATORS,
  HOUSING_INDICATORS,
  demographicsScoped,
} from "@/components/analysis/populationIndicators";
import { formatProximity } from "@/components/analysis/proximityFormat";
import { RISK_LEVEL_BADGES, riskName, splitRisks } from "@/components/analysis/riskLevels";
import { sectionTitles } from "@/components/analysis/sections";
import { COLORS, FONTS } from "../pdfStyles";
import { PdfBadge, PdfCardBox, PdfCardTitle, pdfSafe } from "./PdfCard";
import { PdfInsight } from "./PdfInsight";
import { FEATURES } from "@/lib/site-features";
import { usePdfMessages } from "../pdfMessages";
import type { NearbyMessages } from "@/i18n/messages/fr/analysis/nearby";
import type { PdfMessages } from "@/i18n/messages/fr/analysis/pdf";

/**
 * La fiche de synthèse : un bloc par section de l'écran, avec son « En bref » et quelques
 * faits, sans graphes ni listes complètes.
 *
 * Le PDF s'imprime pour retenir et comparer — une visite, un rendez-vous à la banque, deux
 * adresses posées côte à côte — pas pour explorer : les courbes, cartes et listes restent
 * sur la page en ligne, dont la fiche donne le lien. Les faits accompagnent toujours les
 * « En bref » : sans eux, une phrase écrite par un modèle ne se vérifie pas, et la fiche
 * serait vide le jour où la génération échoue.
 *
 * Toute la logique vient des modules partagés avec les cards (`mobilityView`,
 * `presentFamilies`, `compactIndicator`…) : la fiche ne recalcule rien.
 */

const s = StyleSheet.create({
  fact: { fontSize: 9, color: COLORS.textSoft, lineHeight: 1.45, marginTop: 2 },
  label: { fontFamily: FONTS.sansBold, color: COLORS.text },
  sub: { fontFamily: FONTS.sansBold, fontSize: 9.5, color: COLORS.accent, marginTop: 7, marginBottom: 1 },
  badgeLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 3 },
  badgeText: { fontSize: 9, color: COLORS.text },
  badgeMuted: { fontSize: 8.5, color: COLORS.muted },
  figures: {
    flexDirection: "row",
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: COLORS.hairlineStrong,
    paddingVertical: 8,
    marginBottom: 10,
  },
  figure: { flex: 1, paddingHorizontal: 8 },
  figureBordered: { borderLeftWidth: 0.5, borderLeftColor: COLORS.hairline },
  figureLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.mutedSoft,
    marginBottom: 3,
  },
  figureValue: { fontFamily: FONTS.serif, fontSize: 13, color: COLORS.text },
});

/** Couleurs des pastilles `.zone-badge--*`, que le PDF ne lit pas dans la feuille de style. */
const ZONE_BADGE_COLORS: Record<string, { background: string; color: string }> = {
  "zone-badge zone-badge--u": { background: "#dbeafe", color: "#1e40af" },
  "zone-badge zone-badge--au": { background: "#fef3c7", color: "#92400e" },
  "zone-badge zone-badge--a": { background: "#d1fae5", color: "#065f46" },
  "zone-badge zone-badge--n": { background: "#ecfdf5", color: "#047857" },
};
const DEFAULT_ZONE_BADGE = { background: "#f3f4f6", color: COLORS.muted };

/** Les morceaux présents, séparés par un point médian. */
function join(parts: Array<string | null | false | undefined>, separator = " · "): string {
  return parts.filter((part): part is string => Boolean(part)).join(separator);
}

/** Une ligne de faits : « Libellé : valeur ». Rien si la valeur est vide. */
function Fact({ label, children }: { label?: string; children: string }) {
  const { pdf } = usePdfMessages();
  if (!children) return null;
  return (
    <Text style={s.fact}>
      {label && (
        <Text style={s.label}>
          {label}
          {pdf.labelSeparator}
        </Text>
      )}
      {pdfSafe(children)}
    </Text>
  );
}

function Sub({ children }: { children: string }) {
  return <Text style={s.sub}>{children}</Text>;
}

/** Bloc de section, insécable par défaut : la fiche en compte une dizaine, tous courts. */
function Block({
  title,
  insight,
  wrap = false,
  children,
}: {
  title: string;
  insight?: string | null;
  wrap?: boolean;
  children: ReactNode;
}) {
  return (
    <PdfCardBox wrap={wrap}>
      <PdfCardTitle>{title}</PdfCardTitle>
      <PdfInsight text={insight} />
      {children}
    </PdfCardBox>
  );
}

// ─── En-tête ────────────────────────────────────────────────────────────────────────────

/** Les tuiles du bandeau de l'écran (`buildKeyFigures`), plus d'éventuels chiffres propres au papier. */
export function PdfKeyFigures({ figures }: { figures: Array<Pick<KeyFigure, "label" | "value">> }) {
  if (figures.length === 0) return null;
  return (
    <View style={s.figures} wrap={false}>
      {figures.map((figure, i) => (
        <View key={figure.label} style={[s.figure, i > 0 ? s.figureBordered : {}]}>
          <Text style={s.figureLabel}>{figure.label}</Text>
          <Text style={s.figureValue}>{pdfSafe(figure.value)}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Sections ───────────────────────────────────────────────────────────────────────────

export function PdfImmobilierFiche({
  realEstate,
  cadastre,
  localTax,
  localTaxInsight,
}: {
  realEstate: RealEstateAnalysisDto | null;
  cadastre: CadastreAnalysisDto | null;
  /** `null` quand la card « Fiscalité locale » n'est pas rendue. */
  localTax: LocalTaxAnalysisDto | null;
  localTaxInsight?: string | null;
}) {
  const {
    cadastre: cadastreMessages,
    climate: climateMessages,
    air: airMessages,
    elections: electionsMessages,
    localTax: localTaxMessages,
    mobility: mobilityMessages,
    nearby: nearbyMessages,
    population,
    risks: risksMessages,
    sections,
    pdf,
  } = usePdfMessages();
  const SECTION_TITLES = sectionTitles(sections, FEATURES.showAirQuality);
  const zone = cadastre?.urbanZone ?? null;
  const type = zone ? pluZoneType(zone.type, cadastreMessages) : null;
  const longLabel = zone ? pluZoneLongLabel(zone.label) : null;
  const median = realEstate?.medianPricePerSquareMeter;
  const transactions = realEstate?.nearbyTransactionsCount ?? 0;

  return (
    <Block title={SECTION_TITLES.immobilier}>
      {realEstate && (
        <Fact label={pdf.property.marketLabel}>
          {join([
            median != null && median > 0 && pdf.property.median(median),
            Boolean(transactions) && pdf.property.transactions(transactions),
          ]) || pdf.property.noSale}
        </Fact>
      )}
      {cadastre?.parcel && (
        <Fact label={pdf.property.parcelLabel}>
          {pdf.property.parcel(
            cadastreMessages.surface(cadastre.parcel.contenance),
            cadastre.parcel.section,
            cadastre.parcel.numero,
          )}
        </Fact>
      )}
      {zone && type && (
        <View style={s.badgeLine}>
          <Text style={[s.fact, s.label, { marginTop: 0 }]}>{pdf.property.zoneLabel}</Text>
          <PdfBadge label={type.label} {...(ZONE_BADGE_COLORS[type.className] ?? DEFAULT_ZONE_BADGE)} />
          <Text style={s.badgeText}>{zone.code}</Text>
          {longLabel && <Text style={s.badgeMuted}>{longLabel}</Text>}
        </View>
      )}
      {cadastre && cadastre.prescriptions.length > 0 && (
        <Fact label={pdf.property.prescriptionsLabel}>{join(cadastre.prescriptions.map((p) => p.label), " ; ")}</Fact>
      )}
      {localTax && (
        <View>
          <Sub>{localTaxMessages.pdf.heading(localTax.villeEntiere)}</Sub>
          <PdfInsight text={localTaxInsight} />
          {localTaxFacts(localTax, localTaxMessages).map((fact) => (
            <Fact key={fact.label} label={fact.label}>
              {fact.text}
            </Fact>
          ))}
        </View>
      )}
    </Block>
  );
}

/** « 23 », « 1 », « aucun » — suivi, s'il existe, de l'équipement le plus proche. */
function countLine(
  count: number | null,
  nearest: { name: string; category: string; distanceMeters: number } | null,
  nearby: NearbyMessages,
  pdf: PdfMessages,
): string {
  const closest = nearest
    ? pdf.nearby.closest(poiName(nearest, nearby.neighborhood), formatProximity(nearest.distanceMeters, nearby))
    : "";
  return pdf.nearby.count(count, closest);
}

export function PdfProximiteFiche({
  neighborhood,
  schoolSector,
  communeEquipment,
}: {
  /** `null` en mode commune : les POI y sont mesurés depuis le centroïde. */
  neighborhood: NeighborhoodAnalysisDto | null;
  schoolSector: SchoolSectorDto | null;
  /** Mode commune : les équipements de la commune entière, à la place du voisinage. */
  communeEquipment?: CommuneEquipmentDto | null;
}) {
  const {
    cadastre: cadastreMessages,
    climate: climateMessages,
    air: airMessages,
    elections: electionsMessages,
    localTax: localTaxMessages,
    mobility: mobilityMessages,
    nearby: nearbyMessages,
    population,
    risks: risksMessages,
    sections,
    pdf,
  } = usePdfMessages();
  const SECTION_TITLES = sectionTitles(sections, FEATURES.showAirQuality);
  const groups = neighborhood ? groupByCategory(neighborhood.pois) : {};
  // Les restaurants à part : 177 à 500 m d'une adresse du 15e, ils faisaient de « Culture
  // & loisirs » une famille de 194 équipements, et son « plus proche » était un restaurant.
  // La tuile « À moins de 500 m » les écarte pour la même raison.
  const { restaurant: restaurants = [], ...daily } = groups;
  const nearestOf = (pois: NeighborhoodAnalysisDto["pois"]) =>
    [...pois].sort((a, b) => a.distanceMeters - b.distanceMeters)[0] ?? null;
  // L'équipement le plus proche de chaque famille : la question qu'on se pose en visite
  // (« une école ? un médecin ? ») tient en une ligne par famille.
  const nearestByFamily = new Map(
    presentFamilies(daily).map((family) => [
      nearbyMessages.neighborhood.families[family.key],
      nearestOf(family.categories.flatMap((category) => daily[category])),
    ]),
  );
  // Avec les comptages, une ligne par famille, même vide ; sans eux, le seul équipement
  // le plus proche, comme avant.
  const counts = neighborhood?.counts ?? null;
  const rows = counts
    ? [
        ...familyCounts({ ...counts.byCategory, restaurant: 0 }).map(({ key, count }) => {
          const title = nearbyMessages.neighborhood.families[key];
          return { title, count, nearest: nearestByFamily.get(title) ?? null };
        }),
        { title: pdf.nearby.restaurants, count: counts.byCategory.restaurant ?? 0, nearest: nearestOf(restaurants) },
      ]
    : [
        ...[...nearestByFamily].map(([title, nearest]) => ({ title, count: null, nearest })),
        ...(restaurants.length ? [{ title: pdf.nearby.restaurants, count: null, nearest: nearestOf(restaurants) }] : []),
      ];

  return (
    <Block title={SECTION_TITLES.proximite}>
      {schoolSector && (
        <Fact label={nearbyMessages.school.levels[schoolSector.niveau]}>{schoolSector.nomEtablissement}</Fact>
      )}
      {communeEquipment && (
        <>
          <Fact>{equipmentFootnote(communeEquipment, nearbyMessages.communeEquipment)}</Fact>
          {communeEquipment.families.map((family) => {
            const { present, absent } = splitRubrics(family.rubrics);
            return (
              <View key={family.key} wrap={false}>
                <Sub>{familyTitle(family, nearbyMessages.communeEquipment)}</Sub>
                {present.map((rubric) => (
                  <Fact key={rubric.key} label={rubricLabel(rubric, nearbyMessages.communeEquipment)}>
                    {equipmentLine(rubric, communeEquipment.population, nearbyMessages.communeEquipment)}
                  </Fact>
                ))}
                {absent.length > 0 && <Fact>{absentLine(absent, nearbyMessages.communeEquipment)}</Fact>}
              </View>
            );
          })}
          {communeEquipment.isArrondissement && <Fact>{pdf.nearby.arrondissementNote}</Fact>}
        </>
      )}
      {counts && <Sub>{pdf.nearby.radius(counts.radiusMeters)}</Sub>}
      {rows.map(({ title, count, nearest }) => (
        <Fact key={title} label={title}>
          {countLine(count, nearest, nearbyMessages, pdf)}
        </Fact>
      ))}
    </Block>
  );
}

export function PdfDeplacerFiche({ mobility, mode }: { mobility: MobilityAnalysisDto; mode: AnalysisMode }) {
  const {
    cadastre: cadastreMessages,
    climate: climateMessages,
    air: airMessages,
    elections: electionsMessages,
    localTax: localTaxMessages,
    mobility: mobilityMessages,
    nearby: nearbyMessages,
    population,
    risks: risksMessages,
    sections,
    pdf,
  } = usePdfMessages();
  const SECTION_TITLES = sectionTitles(sections, FEATURES.showAirQuality);
  const { isCommune, stops, stations, stationsHeading } = mobilityView(mobility, mode);
  const stationsTitle = stationsHeading
    ? mobilityMessages.stationsTitle(stationsHeading.kind, stationsHeading.nearestOnly)
    : "";
  const stop = stops[0];
  const station = stations[0];
  const proximity = (meters: number) => (isCommune ? null : formatProximity(meters, nearbyMessages));
  // Pas de comptage en mode commune : le rayon partirait du centre de la commune.
  const counts = isCommune ? null : (mobility.counts ?? null);

  return (
    <Block title={SECTION_TITLES.deplacer}>
      {counts && (
        <Fact label={pdf.nearby.radius(counts.radiusMeters)}>
          {join([
            pdf.transport.stops(counts.stops),
            pdf.transport.stations(counts.stations),
          ])}
        </Fact>
      )}
      {stop && (
        <Fact label={pdf.transport.nearestBusLabel}>
          {pdf.transport.stop(stop.name, proximity(stop.distanceMeters))}
        </Fact>
      )}
      {station && (
        <Fact label={stationsTitle}>{pdf.transport.stop(station.name, proximity(station.distanceMeters))}</Fact>
      )}
      {!stop && !station && <Fact>{pdf.transport.none}</Fact>}
    </Block>
  );
}

/**
 * Sécurité : l'« En bref » seul. Le bloc disparaît sans lui — la fiche ne reprend ni les
 * courbes par indicateur ni la note de méthode, qui restent sur la page en ligne.
 */
export function PdfSecuriteFiche({ insight }: { insight?: string | null }) {
  const {
    cadastre: cadastreMessages,
    climate: climateMessages,
    air: airMessages,
    elections: electionsMessages,
    localTax: localTaxMessages,
    mobility: mobilityMessages,
    nearby: nearbyMessages,
    population,
    risks: risksMessages,
    sections,
    pdf,
  } = usePdfMessages();
  const SECTION_TITLES = sectionTitles(sections, FEATURES.showAirQuality);
  if (!insight?.trim()) return null;
  return <Block title={SECTION_TITLES.securite} insight={insight}>{null}</Block>;
}

export function PdfPopulationFiche({
  demographics,
  mode,
  insights,
  show,
}: {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
  insights: CardInsights;
  show: { demographics: boolean; employment: boolean; households: boolean; housing: boolean };
}) {
  const {
    cadastre: cadastreMessages,
    climate: climateMessages,
    air: airMessages,
    elections: electionsMessages,
    localTax: localTaxMessages,
    mobility: mobilityMessages,
    nearby: nearbyMessages,
    population,
    risks: risksMessages,
    sections,
    pdf,
  } = usePdfMessages();
  const SECTION_TITLES = sectionTitles(sections, FEATURES.showAirQuality);
  const demo = show.demographics ? viewForMode(demographicsScoped(demographics), mode, demographics, population) : null;
  const employment = show.employment ? viewForMode(demographics.employment, mode, demographics, population) : null;
  const households = show.households ? viewForMode(demographics.households, mode, demographics, population) : null;
  const housing = show.housing ? viewForMode(demographics.housing, mode, demographics, population) : null;
  const local = housing?.scoped.iris;
  const france = housing?.scoped.france;

  return (
    // Le seul bloc autorisé à se couper : quatre « En bref » et leurs indicateurs.
    <Block title={SECTION_TITLES.population} wrap>
      <Fact label={pdf.population.scopeLabel(mode === "commune")}>
        {mode === "commune"
          ? demographics.nomCommune || demographics.codeIris
          : join([demographics.nomIris || demographics.codeIris, demographics.nomCommune], " — ")}
      </Fact>

      {demo && (
        <View wrap={false}>
          <Sub>{population.demographics.title}</Sub>
          <PdfInsight text={insights.demographie} />
          <Fact>{join(DEMOGRAPHICS_INDICATORS.map((i) => compactIndicator(i, demo)))}</Fact>
        </View>
      )}
      {employment && (
        <View wrap={false}>
          <Sub>{population.employment.title}</Sub>
          <PdfInsight text={insights.emploi} />
          <Fact>{join(EMPLOYMENT_INDICATORS.map((i) => compactIndicator(i, employment)))}</Fact>
        </View>
      )}
      {households && (
        <View wrap={false}>
          <Sub>{population.households.title}</Sub>
          <PdfInsight text={insights.menages} />
          <Fact>{join(HOUSEHOLDS_INDICATORS.map((i) => compactIndicator(i, households)))}</Fact>
        </View>
      )}
      {housing && (
        <View wrap={false}>
          <Sub>{population.housing.title}</Sub>
          <PdfInsight text={insights.logement} />
          <Fact>
            {join([
              local?.pctProprietaires != null &&
                population.compact(
                  population.segments.owners,
                  population.format.pct(local.pctProprietaires),
                  france?.pctProprietaires != null ? population.format.pct(france.pctProprietaires) : null,
                ),
              ...HOUSING_INDICATORS.map((i) => compactIndicator(i, housing)),
            ])}
          </Fact>
        </View>
      )}
    </Block>
  );
}

export function PdfElectionsFiche({
  municipales,
  elections,
  insights,
}: {
  municipales: MunicipalesAnalysisDto | null;
  elections: ElectionsAnalysisDto | null;
  insights: CardInsights;
}) {
  const {
    cadastre: cadastreMessages,
    climate: climateMessages,
    air: airMessages,
    elections: electionsMessages,
    localTax: localTaxMessages,
    mobility: mobilityMessages,
    nearby: nearbyMessages,
    population,
    risks: risksMessages,
    sections,
    pdf,
  } = usePdfMessages();
  const SECTION_TITLES = sectionTitles(sections, FEATURES.showAirQuality);
  const topListe = municipales?.listes.length
    ? [...municipales.listes].sort((a, b) => b.pctExprimes - a.pctExprimes)[0]
    : null;
  const podium = elections ? [...elections.candidates].sort((a, b) => b.pctCommune - a.pctCommune).slice(0, 3) : [];

  return (
    <Block title={SECTION_TITLES.elections}>
      {municipales && topListe && (
        <View>
          <Sub>{electionsMessages.municipal.title(municipales.tour)}</Sub>
          <PdfInsight text={insights.municipales} />
          <Fact label={pdf.elections.leadingLabel}>
            {join([
              pdf.elections.leadingList(
                topListe.nuance ? (electionsMessages.nuances[topListe.nuance] ?? topListe.nuance) : topListe.libelle,
                topListe.teteDeListe ?? null,
                electionsMessages.pct(topListe.pctExprimes),
              ),
              pdf.elections.participation(electionsMessages.pct(municipales.participationPct)),
            ])}
          </Fact>
        </View>
      )}
      {elections && podium.length > 0 && (
        <View>
          <Sub>{electionsMessages.presidential.title}</Sub>
          <PdfInsight text={insights.elections} />
          <Fact label={pdf.elections.leadingLabel}>
            {join(podium.map((c) => pdf.elections.candidate(c.candidat, electionsMessages.pct(c.pctCommune))))}
          </Fact>
          <Fact label={pdf.elections.participationLabel}>
            {pdf.elections.participationVsFrance(
              electionsMessages.pct(elections.participationPct),
              electionsMessages.pct(elections.nationalParticipationPct),
            )}
          </Fact>
        </View>
      )}
    </Block>
  );
}

export function PdfEnvironnementFiche({
  climate,
  airQuality,
  insight,
}: {
  climate: ClimateAnalysisDto | null;
  airQuality: AirQualityAnalysisDto | null;
  insight?: string | null;
}) {
  const {
    cadastre: cadastreMessages,
    climate: climateMessages,
    air: airMessages,
    elections: electionsMessages,
    localTax: localTaxMessages,
    mobility: mobilityMessages,
    nearby: nearbyMessages,
    population,
    risks: risksMessages,
    sections,
    pdf,
  } = usePdfMessages();
  const SECTION_TITLES = sectionTitles(sections, FEATURES.showAirQuality);
  const monthly = airQuality?.monthly;
  const airLevel =
    monthly && monthly.daysCovered > 0 ? monthly.level : airQuality ? modalLevel(airQuality.recentDays) : null;
  const airDays = monthly && monthly.daysCovered > 0 ? monthly.daysCovered : airQuality?.recentDays.length ?? 0;
  const measure = (metric: ClimateMetric, value: number | null, reference: number) => {
    const format = climateMessages.pdfFormat[metric];
    return value != null
      ? climateMessages.pdfMeasure(climateMessages.metrics[metric].label, format(value), format(reference))
      : null;
  };

  return (
    <Block title={SECTION_TITLES.environnement}>
      {climate && (
        <View>
          <Sub>{climateTitle(climate, climateMessages)}</Sub>
          <PdfInsight text={insight} />
          <Fact>
            {join([
              measure("temperatureC", climate.temperatureC, climate.national.temperatureC),
              measure("precipitationMm", climate.precipitationMm, climate.national.precipitationMm),
              measure("sunshineHours", climate.sunshineHours, climate.national.sunshineHours),
            ])}
          </Fact>
        </View>
      )}
      {airLevel && (
        <Fact label={airMessages.pdfLabel}>{airMessages.pdfLine(airLevel, airDays)}</Fact>
      )}
    </Block>
  );
}

export function PdfRisquesFiche({ risks }: { risks: RiskAnalysisDto }) {
  const {
    cadastre: cadastreMessages,
    climate: climateMessages,
    air: airMessages,
    elections: electionsMessages,
    localTax: localTaxMessages,
    mobility: mobilityMessages,
    nearby: nearbyMessages,
    population,
    risks: risksMessages,
    sections,
    pdf,
  } = usePdfMessages();
  const SECTION_TITLES = sectionTitles(sections, FEATURES.showAirQuality);
  const { highlighted, minor } = splitRisks(risks.categories);

  return (
    <Block title={SECTION_TITLES.risques}>
      {highlighted.map((risk) => {
        const badge = RISK_LEVEL_BADGES[risk.level];
        return (
          <View key={risk.code} style={s.badgeLine}>
            <PdfBadge label={risksMessages.levels[risk.level]} background={badge.background} color={badge.color} dashed={badge.dashed} />
            <Text style={s.badgeText}>{riskName(risk, risksMessages)}</Text>
          </View>
        );
      })}
      {minor.length > 0 && (
        <Fact label={risksMessages.pdf.othersLabel}>
          {join(minor.map((risk) => risksMessages.pdf.other(riskName(risk, risksMessages), risksMessages.levels[risk.level])))}
        </Fact>
      )}
      {highlighted.length === 0 && minor.length === 0 && <Fact>{risksMessages.pdf.none}</Fact>}
    </Block>
  );
}
