import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { LocationAnalysisDto, RealEstateAnalysisDto } from "@/types/location-analysis";
import { formatFr } from "@/lib/format";
import "./registerFonts";
import { pdfStyles } from "./pdfStyles";
import { PdfCoverResume } from "./sections/PdfSummary";
import { PdfMobility } from "./sections/PdfMobility";
import { PdfRisks } from "./sections/PdfRisks";
import { PdfAirQuality } from "./sections/PdfAirQuality";
import { PdfRealEstate } from "./sections/PdfRealEstate";
import { PdfNeighborhood } from "./sections/PdfNeighborhood";
import { PdfDemographics } from "./sections/PdfDemographics";
import { PdfElections } from "./sections/PdfElections";
import { PdfClimate } from "./sections/PdfClimate";
import { PdfCadastre } from "./sections/PdfCadastre";
import { PdfSchoolSector } from "./sections/PdfSchoolSector";
import { PdfMap } from "./sections/PdfMap";
import { BRANDING, FEATURES } from "@/lib/site-features";

interface Props {
  data: LocationAnalysisDto;
  realEstate: RealEstateAnalysisDto | null;
  mapDataUrl: string | null;
  narrativeParagraph: string | null;
  generatedAt: Date;
}

function splitAddress(label: string, city: string, postcode: string) {
  const trail = `${postcode} ${city}`.trim();
  let street = label;
  if (trail && label.includes(trail)) {
    street = label.replace(trail, "").trim().replace(/[,;]+$/, "").trim();
  }
  return { street: street || label, locality: trail || city };
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <Text style={small ? pdfStyles.runningHeaderBrand : pdfStyles.coverBrand}>
      {BRANDING.brandFirst}
      <Text
        style={
          small ? pdfStyles.runningHeaderBrandItalic : pdfStyles.coverBrandItalic
        }
      >
        {BRANDING.brandSecond}
      </Text>
    </Text>
  );
}

function RunningHeader({ chapter }: { chapter: string }) {
  return (
    <View style={pdfStyles.runningHeader} fixed>
      <Text style={pdfStyles.runningHeaderLabel}>Dossier d&apos;analyse</Text>
      <Brand small />
      <Text style={pdfStyles.runningHeaderLabelRight}>{chapter}</Text>
    </View>
  );
}

function RunningFooter({
  date,
  address,
  pageNumber,
  totalPages,
}: {
  date: string;
  address: string;
  pageNumber: number;
  totalPages: number;
}) {
  const pn = `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`;
  return (
    <View style={pdfStyles.runningFooter}>
      <Text style={pdfStyles.runningFooterDate}>{date}</Text>
      <Text style={pdfStyles.runningFooterAddress}>{address}</Text>
      <Text style={pdfStyles.runningFooterPage}>{pn}</Text>
    </View>
  );
}

function ChapterTitle({
  pre,
  italic,
  post,
  subtitle,
}: {
  pre?: string;
  italic: string;
  post?: string;
  subtitle?: string;
}) {
  return (
    <View>
      <Text style={pdfStyles.chapterTitle}>
        {pre}
        <Text style={pdfStyles.chapterTitleItalic}>{italic}</Text>
        {post}
      </Text>
      {subtitle && <Text style={pdfStyles.chapterSub}>{subtitle}</Text>}
    </View>
  );
}

export function AnalysisPdfDocument({
  data,
  realEstate,
  mapDataUrl,
  narrativeParagraph,
  generatedAt,
}: Props) {
  const formattedDate = generatedAt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const { street, locality } = splitAddress(
    data.address.label,
    data.address.city,
    data.address.postcode,
  );

  // Détermine quelles pages sont rendues (cover + map sont toujours là).
  const hasRisksAirClimatePage =
    FEATURES.showRisks ||
    (FEATURES.showAirQuality && data.airQuality.available) ||
    (FEATURES.showClimate && Boolean(data.climate));

  const hasNeighborhoodPage = FEATURES.showNeighborhood && data.mode !== "commune";

  const hasDemoCadastrePage =
    (FEATURES.showDemographics && Boolean(data.demographics)) ||
    (FEATURES.showElections && Boolean(data.elections)) ||
    (FEATURES.showRealEstate && Boolean(realEstate)) ||
    (FEATURES.showCadastre && Boolean(data.cadastre)) ||
    (FEATURES.showSchoolSector && Boolean(data.schoolSector));

  // Numérotation dynamique : cover=1, map=2, puis les optionnelles dans l'ordre.
  let nextPageNum = 3;
  const risksPageNum = hasRisksAirClimatePage ? nextPageNum++ : null;
  const neighborhoodPageNum = hasNeighborhoodPage ? nextPageNum++ : null;
  const demoCadastrePageNum = hasDemoCadastrePage ? nextPageNum++ : null;
  const totalPages = nextPageNum - 1;

  const coverMeta: Array<{ label: string; value: string }> = [];
  if (data.cadastre?.parcel) {
    coverMeta.push({
      label: "Surface",
      value:
        data.cadastre.parcel.contenance >= 10_000
          ? `${(data.cadastre.parcel.contenance / 10_000).toFixed(2)} ha`
          : `${formatFr(data.cadastre.parcel.contenance)} m²`,
    });
  }
  if (coverMeta.length === 0) {
    coverMeta.push({
      label: "Commune",
      value: data.address.city,
    });
    coverMeta.push({
      label: "Code postal",
      value: data.address.postcode,
    });
  }

  return (
    <Document
      title={`Analyse · ${data.address.label}`}
      author={BRANDING.name}
      subject="Analyse d'adresse"
    >
      {/* PAGE 1 — COVER */}
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.coverTop}>
          <Brand />
          <Text style={pdfStyles.coverStamp}>{formattedDate}</Text>
        </View>

        <Text style={pdfStyles.coverEyebrow}>
          Dossier d&apos;analyse
        </Text>
        <View style={pdfStyles.coverEyebrowRule} />

        <Text style={pdfStyles.coverTitle}>{street}</Text>
        <Text style={pdfStyles.coverSubtitle}>{locality}</Text>

        <View style={pdfStyles.coverMeta}>
          {coverMeta.map((item, i) => (
            <View
              key={item.label}
              style={[
                pdfStyles.coverMetaItem,
                i > 0 ? pdfStyles.coverMetaItemBordered : {},
              ]}
            >
              <Text style={pdfStyles.coverMetaLabel}>{item.label}</Text>
              <Text style={pdfStyles.coverMetaValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <PdfCoverResume narrativeParagraph={narrativeParagraph} />

        <View style={pdfStyles.coverFooter}>
          <Text style={pdfStyles.runningFooterDate}>{formattedDate}</Text>
          <Text style={pdfStyles.runningFooterPage}>01 / {String(totalPages).padStart(2, "0")}</Text>
        </View>
      </Page>

      {/* PAGE 2 — CARTE (optionnelle selon variante) + MOBILITÉ */}
      <Page size="A4" style={pdfStyles.page}>
        <RunningHeader chapter={FEATURES.showLocation ? "Carte" : "Mobilité"} />
        {FEATURES.showLocation ? (
          <>
            <ChapterTitle italic="Carte" subtitle={data.address.label} />
            {mapDataUrl && <PdfMap mapDataUrl={mapDataUrl} />}
            <View style={{ marginTop: 6 }}>
              <Text style={pdfStyles.chapterTitle}>
                <Text style={pdfStyles.chapterTitleItalic}>Mobilité</Text>
                {" & transports"}
              </Text>
            </View>
          </>
        ) : (
          <ChapterTitle italic="Mobilité" post=" & transports" subtitle={data.address.label} />
        )}
        <PdfMobility mobility={data.mobility} mode={data.mode} />

        <RunningFooter
          date={formattedDate}
          address={street}
          pageNumber={2}
          totalPages={totalPages}
        />
      </Page>

      {/* PAGE 3 — RISQUES + AIR + CLIMAT (optionnelle selon variante) */}
      {hasRisksAirClimatePage && risksPageNum !== null && (
        <Page size="A4" style={pdfStyles.page}>
          <RunningHeader chapter="Risques, air & climat" />
          <ChapterTitle italic="Risques" />

          {FEATURES.showRisks && <PdfRisks risks={data.risks} />}

          {FEATURES.showAirQuality && data.airQuality.available && (
            <View style={{ marginTop: 36 }} wrap={false}>
              <Text style={pdfStyles.chapterTitle}>
                {"Qualité de "}
                <Text style={pdfStyles.chapterTitleItalic}>l&apos;air</Text>
              </Text>
              <PdfAirQuality airQuality={data.airQuality} />
            </View>
          )}

          {FEATURES.showClimate && data.climate && <PdfClimate climate={data.climate} />}

          <RunningFooter
            date={formattedDate}
            address={street}
            pageNumber={risksPageNum}
            totalPages={totalPages}
          />
        </Page>
      )}

      {/* PAGE — VOISINAGE (optionnelle selon variante / mode) */}
      {hasNeighborhoodPage && neighborhoodPageNum !== null && (
        <Page size="A4" style={pdfStyles.page}>
          <RunningHeader chapter="Voisinage" />
          <ChapterTitle
            pre="Le "
            italic="voisinage"
            post=" immédiat"
            subtitle="Commerces, services et équipements à proximité"
          />

          <PdfNeighborhood neighborhood={data.neighborhood} />

          <RunningFooter
            date={formattedDate}
            address={street}
            pageNumber={neighborhoodPageNum}
            totalPages={totalPages}
          />
        </Page>
      )}

      {/* PAGE — DÉMO + IMMO + CADASTRE (optionnelle selon variante) */}
      {hasDemoCadastrePage && demoCadastrePageNum !== null && (
        <Page size="A4" style={pdfStyles.page}>
          <RunningHeader chapter="Démographie & cadastre" />
          <ChapterTitle
            italic="Démographie"
            post=" du quartier"
          />

          {FEATURES.showDemographics && data.demographics && <PdfDemographics demographics={data.demographics} />}

          {FEATURES.showElections && data.elections && <PdfElections elections={data.elections} />}

          {FEATURES.showRealEstate && realEstate && (
            <View style={{ marginTop: 36 }} wrap={false}>
              <Text style={pdfStyles.chapterTitle}>
                <Text style={pdfStyles.chapterTitleItalic}>Immobilier</Text>
              </Text>
              <PdfRealEstate realEstate={realEstate} />
            </View>
          )}

          {FEATURES.showCadastre && data.cadastre && (
            <View style={{ marginTop: 36 }} wrap={false}>
              <Text style={pdfStyles.chapterTitle}>
                {"Cadastre & "}
                <Text style={pdfStyles.chapterTitleItalic}>urbanisme</Text>
              </Text>
              <PdfCadastre cadastre={data.cadastre} />
            </View>
          )}

          {FEATURES.showSchoolSector && data.schoolSector && (
            <View style={{ marginTop: 36 }} wrap={false}>
              <Text style={pdfStyles.chapterTitle}>
                {"Carte "}
                <Text style={pdfStyles.chapterTitleItalic}>scolaire</Text>
              </Text>
              <PdfSchoolSector schoolSector={data.schoolSector} />
            </View>
          )}

          <View style={pdfStyles.endMark}>
            <View style={pdfStyles.endMarkLine} />
            <Text style={pdfStyles.endMarkText}>Fin du dossier</Text>
            <View style={pdfStyles.endMarkLine} />
          </View>

          <RunningFooter
            date={formattedDate}
            address={`Sources : IGN · DVF · Géorisques · INSEE · ATMO`}
            pageNumber={demoCadastrePageNum}
            totalPages={totalPages}
          />
        </Page>
      )}
    </Document>
  );
}
