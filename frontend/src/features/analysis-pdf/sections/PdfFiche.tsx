import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type {
  AirQualityAnalysisDto,
  AnalysisMode,
  CadastreAnalysisDto,
  CardInsights,
  ClimateAnalysisDto,
  DemographicsAnalysisDto,
  ElectionsAnalysisDto,
  MobilityAnalysisDto,
  MunicipalesAnalysisDto,
  NeighborhoodAnalysisDto,
  RealEstateAnalysisDto,
  RiskAnalysisDto,
  SchoolSectorDto,
} from "@/types/location-analysis";
import { formatFr } from "@/lib/format";
import { LEVEL_CONFIG, modalLevel } from "@/components/analysis/airQualityModel";
import { formatSurface } from "@/components/analysis/cadastreFormat";
import { climateTitle } from "@/components/analysis/climateFormat";
import { formatPct } from "@/components/analysis/demographicsFormat";
import { formatElectionPct } from "@/components/analysis/electionFormat";
import { NUANCE_LABEL } from "@/components/analysis/electionLabels";
import { compactIndicator } from "@/components/analysis/indicator";
import { viewForMode } from "@/components/analysis/inseeChart";
import type { KeyFigure } from "@/components/analysis/KeyFigures";
import { mobilityView } from "@/components/analysis/mobilityModel";
import { familyCounts, groupByCategory, presentFamilies } from "@/components/analysis/neighborhoodModel";
import { pluZoneLongLabel, pluZoneType } from "@/components/analysis/pluZone";
import {
  DEMOGRAPHICS_INDICATORS,
  EMPLOYMENT_INDICATORS,
  HOUSEHOLDS_INDICATORS,
  HOUSING_INDICATORS,
  demographicsScoped,
} from "@/components/analysis/populationIndicators";
import { formatProximity } from "@/components/analysis/proximityFormat";
import { RISK_LEVEL_BADGES, splitRisks } from "@/components/analysis/riskLevels";
import { SECTION_TITLES } from "@/components/analysis/sections";
import { SCHOOL_LEVEL_LABEL } from "@/components/analysis/sectorSchool";
import { COLORS, FONTS } from "../pdfStyles";
import { PdfBadge, PdfCardBox, PdfCardTitle, pdfSafe } from "./PdfCard";
import { PdfInsight } from "./PdfInsight";

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
  if (!children) return null;
  return (
    <Text style={s.fact}>
      {label && <Text style={s.label}>{label} : </Text>}
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
}: {
  realEstate: RealEstateAnalysisDto | null;
  cadastre: CadastreAnalysisDto | null;
}) {
  const zone = cadastre?.urbanZone ?? null;
  const type = zone ? pluZoneType(zone.type) : null;
  const longLabel = zone ? pluZoneLongLabel(zone.label) : null;
  const median = realEstate?.medianPricePerSquareMeter;
  const transactions = realEstate?.nearbyTransactionsCount ?? 0;

  return (
    <Block title={SECTION_TITLES.immobilier}>
      {realEstate && (
        <Fact label="Marché">
          {join([
            median != null && median > 0 && `prix médian ${formatFr(Math.round(median))} €/m²`,
            Boolean(transactions) && `${transactions} transaction${transactions > 1 ? "s" : ""} proche${transactions > 1 ? "s" : ""}`,
          ]) || "aucune vente récente recensée"}
        </Fact>
      )}
      {cadastre?.parcel && (
        <Fact label="Parcelle">
          {`${formatSurface(cadastre.parcel.contenance)} · section ${cadastre.parcel.section} n° ${cadastre.parcel.numero}`}
        </Fact>
      )}
      {zone && type && (
        <View style={s.badgeLine}>
          <Text style={[s.fact, s.label, { marginTop: 0 }]}>Zone PLU :</Text>
          <PdfBadge label={type.label} {...(ZONE_BADGE_COLORS[type.className] ?? DEFAULT_ZONE_BADGE)} />
          <Text style={s.badgeText}>{zone.code}</Text>
          {longLabel && <Text style={s.badgeMuted}>{longLabel}</Text>}
        </View>
      )}
      {cadastre && cadastre.prescriptions.length > 0 && (
        <Fact label="Prescriptions">{join(cadastre.prescriptions.map((p) => p.label), " ; ")}</Fact>
      )}
    </Block>
  );
}

/** « 23 », « 1 », « aucun » — suivi, s'il existe, de l'équipement le plus proche. */
function countLine(count: number | null, nearest: { name: string; distanceMeters: number } | null): string {
  const closest = nearest ? `${nearest.name} (${formatProximity(nearest.distanceMeters)})` : "";
  if (count === null) return closest;
  if (count === 0) return closest ? `aucun dans le rayon — le plus proche : ${closest}` : "aucun dans le rayon";
  return closest ? `${count} — le plus proche : ${closest}` : String(count);
}

function plural(count: number, zero: string, one: string, many: string): string {
  return count === 0 ? zero : `${count} ${count > 1 ? many : one}`;
}

export function PdfProximiteFiche({
  neighborhood,
  schoolSector,
}: {
  /** `null` en mode commune : les POI y sont mesurés depuis le centroïde. */
  neighborhood: NeighborhoodAnalysisDto | null;
  schoolSector: SchoolSectorDto | null;
}) {
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
      family.title,
      nearestOf(family.categories.flatMap((category) => daily[category])),
    ]),
  );
  // Avec les comptages, une ligne par famille, même vide ; sans eux, le seul équipement
  // le plus proche, comme avant.
  const counts = neighborhood?.counts ?? null;
  const rows = counts
    ? [
        ...familyCounts({ ...counts.byCategory, restaurant: 0 }).map(({ title, count }) => ({
          title,
          count,
          nearest: nearestByFamily.get(title) ?? null,
        })),
        { title: "Restaurants", count: counts.byCategory.restaurant ?? 0, nearest: nearestOf(restaurants) },
      ]
    : [
        ...[...nearestByFamily].map(([title, nearest]) => ({ title, count: null, nearest })),
        ...(restaurants.length ? [{ title: "Restaurants", count: null, nearest: nearestOf(restaurants) }] : []),
      ];

  return (
    <Block title={SECTION_TITLES.proximite}>
      {schoolSector && (
        <Fact label={SCHOOL_LEVEL_LABEL[schoolSector.niveau]}>{schoolSector.nomEtablissement}</Fact>
      )}
      {counts && <Sub>{`Dans un rayon de ${counts.radiusMeters} m`}</Sub>}
      {rows.map(({ title, count, nearest }) => (
        <Fact key={title} label={title}>
          {countLine(count, nearest)}
        </Fact>
      ))}
    </Block>
  );
}

export function PdfDeplacerFiche({ mobility, mode }: { mobility: MobilityAnalysisDto; mode: AnalysisMode }) {
  const { isCommune, stops, stations, stationsTitle } = mobilityView(mobility, mode);
  const stop = stops[0];
  const station = stations[0];
  const distance = (meters: number) => (isCommune ? "" : ` (${formatProximity(meters)})`);
  // Pas de comptage en mode commune : le rayon partirait du centre de la commune.
  const counts = isCommune ? null : (mobility.counts ?? null);

  return (
    <Block title={SECTION_TITLES.deplacer}>
      {counts && (
        <Fact label={`Dans un rayon de ${counts.radiusMeters} m`}>
          {join([
            plural(counts.stops, "aucun arrêt de bus ou tram", "arrêt de bus ou tram", "arrêts de bus ou tram"),
            plural(counts.stations, "aucune gare ou station", "gare ou station", "gares ou stations"),
          ])}
        </Fact>
      )}
      {stop && <Fact label="Bus ou tram le plus proche">{`${stop.name}${distance(stop.distanceMeters)}`}</Fact>}
      {station && <Fact label={stationsTitle}>{`${station.name}${distance(station.distanceMeters)}`}</Fact>}
      {!stop && !station && <Fact>Aucun arrêt trouvé à proximité.</Fact>}
    </Block>
  );
}

/**
 * Sécurité : l'« En bref » seul. Le bloc disparaît sans lui — la fiche ne reprend ni les
 * courbes par indicateur ni la note de méthode, qui restent sur la page en ligne.
 */
export function PdfSecuriteFiche({ insight }: { insight?: string | null }) {
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
  const demo = show.demographics ? viewForMode(demographicsScoped(demographics), mode, demographics) : null;
  const employment = show.employment ? viewForMode(demographics.employment, mode, demographics) : null;
  const households = show.households ? viewForMode(demographics.households, mode, demographics) : null;
  const housing = show.housing ? viewForMode(demographics.housing, mode, demographics) : null;
  const local = housing?.scoped.iris;
  const france = housing?.scoped.france;

  return (
    // Le seul bloc autorisé à se couper : quatre « En bref » et leurs indicateurs.
    <Block title={SECTION_TITLES.population} wrap>
      <Fact label={mode === "commune" ? "Commune" : "Quartier IRIS"}>
        {mode === "commune"
          ? demographics.nomCommune || demographics.codeIris
          : join([demographics.nomIris || demographics.codeIris, demographics.nomCommune], " — ")}
      </Fact>

      {demo && (
        <View wrap={false}>
          <Sub>Démographie</Sub>
          <PdfInsight text={insights.demographie} />
          <Fact>{join(DEMOGRAPHICS_INDICATORS.map((i) => compactIndicator(i, demo)))}</Fact>
        </View>
      )}
      {employment && (
        <View wrap={false}>
          <Sub>Emploi et qualifications</Sub>
          <PdfInsight text={insights.emploi} />
          <Fact>{join(EMPLOYMENT_INDICATORS.map((i) => compactIndicator(i, employment)))}</Fact>
        </View>
      )}
      {households && (
        <View wrap={false}>
          <Sub>Ménages et familles</Sub>
          <PdfInsight text={insights.menages} />
          <Fact>{join(HOUSEHOLDS_INDICATORS.map((i) => compactIndicator(i, households)))}</Fact>
        </View>
      )}
      {housing && (
        <View wrap={false}>
          <Sub>Logement</Sub>
          <PdfInsight text={insights.logement} />
          <Fact>
            {join([
              local?.pctProprietaires != null &&
                `Propriétaires ${formatPct(local.pctProprietaires)}${france?.pctProprietaires != null ? ` (France ${formatPct(france.pctProprietaires)})` : ""}`,
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
  const topListe = municipales?.listes.length
    ? [...municipales.listes].sort((a, b) => b.pctExprimes - a.pctExprimes)[0]
    : null;
  const podium = elections ? [...elections.candidates].sort((a, b) => b.pctCommune - a.pctCommune).slice(0, 3) : [];

  return (
    <Block title={SECTION_TITLES.elections}>
      {municipales && topListe && (
        <View>
          <Sub>{`Municipales 2026 — ${municipales.tour === 1 ? "1er" : "2e"} tour`}</Sub>
          <PdfInsight text={insights.municipales} />
          <Fact label="En tête">
            {join([
              `${topListe.nuance ? (NUANCE_LABEL[topListe.nuance] ?? topListe.nuance) : topListe.libelle}${topListe.teteDeListe ? ` (${topListe.teteDeListe})` : ""} ${formatElectionPct(topListe.pctExprimes)}`,
              `participation ${formatElectionPct(municipales.participationPct)}`,
            ])}
          </Fact>
        </View>
      )}
      {elections && podium.length > 0 && (
        <View>
          <Sub>Présidentielle 2022 — 1er tour</Sub>
          <PdfInsight text={insights.elections} />
          <Fact label="En tête">{join(podium.map((c) => `${c.candidat} ${formatElectionPct(c.pctCommune)}`))}</Fact>
          <Fact label="Participation">
            {`${formatElectionPct(elections.participationPct)} (France ${formatElectionPct(elections.nationalParticipationPct)})`}
          </Fact>
        </View>
      )}
    </Block>
  );
}

const fmtTemp = (n: number) => `${n.toFixed(1).replace(".", ",")} °C`;
const fmtMm = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} mm`;
const fmtHours = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} h`;

export function PdfEnvironnementFiche({
  climate,
  airQuality,
  insight,
}: {
  climate: ClimateAnalysisDto | null;
  airQuality: AirQualityAnalysisDto | null;
  insight?: string | null;
}) {
  const monthly = airQuality?.monthly;
  const airLevel =
    monthly && monthly.daysCovered > 0 ? monthly.level : airQuality ? modalLevel(airQuality.recentDays) : null;
  const airDays = monthly && monthly.daysCovered > 0 ? monthly.daysCovered : airQuality?.recentDays.length ?? 0;
  const measure = (label: string, value: number | null, reference: number, format: (n: number) => string) =>
    value != null ? `${label} ${format(value)} (France ${format(reference)})` : null;

  return (
    <Block title={SECTION_TITLES.environnement}>
      {climate && (
        <View>
          <Sub>{climateTitle(climate)}</Sub>
          <PdfInsight text={insight} />
          <Fact>
            {join([
              measure("Température", climate.temperatureC, climate.national.temperatureC, fmtTemp),
              measure("Précipitations", climate.precipitationMm, climate.national.precipitationMm, fmtMm),
              measure("Ensoleillement", climate.sunshineHours, climate.national.sunshineHours, fmtHours),
            ])}
          </Fact>
        </View>
      )}
      {airLevel && (
        <Fact label="Qualité de l'air">
          {`niveau ${LEVEL_CONFIG[airLevel].label.toLowerCase()} sur les ${airDays} derniers jours`}
        </Fact>
      )}
    </Block>
  );
}

export function PdfRisquesFiche({ risks }: { risks: RiskAnalysisDto }) {
  const { highlighted, minor } = splitRisks(risks.categories);

  return (
    <Block title={SECTION_TITLES.risques}>
      {highlighted.map((risk) => {
        const badge = RISK_LEVEL_BADGES[risk.level];
        return (
          <View key={risk.code} style={s.badgeLine}>
            <PdfBadge label={badge.label} background={badge.background} color={badge.color} dashed={badge.dashed} />
            <Text style={s.badgeText}>{risk.name}</Text>
          </View>
        );
      })}
      {minor.length > 0 && (
        <Fact label="Autres risques">
          {join(minor.map((risk) => `${risk.name} (${RISK_LEVEL_BADGES[risk.level].label.toLowerCase()})`))}
        </Fact>
      )}
      {highlighted.length === 0 && minor.length === 0 && <Fact>Aucun risque naturel recensé.</Fact>}
    </Block>
  );
}
