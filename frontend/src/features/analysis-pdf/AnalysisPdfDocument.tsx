import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { LocationAnalysisDto, RealEstateAnalysisDto } from "@/types/location-analysis";
import { pdfStyles } from "./pdfStyles";
import { PdfNarrative } from "./sections/PdfNarrative";
import { PdfSummary } from "./sections/PdfSummary";
import { PdfMobility } from "./sections/PdfMobility";
import { PdfRisks } from "./sections/PdfRisks";
import { PdfAirQuality } from "./sections/PdfAirQuality";
import { PdfRealEstate } from "./sections/PdfRealEstate";
import { PdfNeighborhood } from "./sections/PdfNeighborhood";
import { PdfDemographics } from "./sections/PdfDemographics";
import { PdfCadastre } from "./sections/PdfCadastre";
import { PdfMap } from "./sections/PdfMap";

interface Props {
  data: LocationAnalysisDto;
  realEstate: RealEstateAnalysisDto | null;
  mapDataUrl: string | null;
  narrativeParagraph: string | null;
  generatedAt: Date;
}

export function AnalysisPdfDocument({ data, realEstate, mapDataUrl, narrativeParagraph, generatedAt }: Props) {
  const formattedDate = generatedAt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Analyse — ${data.address.label}`}
      author="ClaireAdresse"
      subject="Analyse d'adresse"
    >
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.headerEyebrow}>ClaireAdresse — Analyse</Text>
          <Text style={pdfStyles.headerTitle}>{data.address.label}</Text>
        </View>

        {mapDataUrl && <PdfMap mapDataUrl={mapDataUrl} addressLabel={data.address.label} />}

        {narrativeParagraph && <PdfNarrative paragraph={narrativeParagraph} />}
        <PdfSummary summary={data.summary} />
        <PdfMobility mobility={data.mobility} />
        <PdfRisks risks={data.risks} />
        <PdfAirQuality airQuality={data.airQuality} />
        {realEstate && <PdfRealEstate realEstate={realEstate} />}
        <PdfNeighborhood neighborhood={data.neighborhood} />
        {data.demographics && <PdfDemographics demographics={data.demographics} />}
        {data.cadastre && <PdfCadastre cadastre={data.cadastre} />}

        <Text
          style={pdfStyles.footer}
          render={({ pageNumber, totalPages }) =>
            `Généré le ${formattedDate} — Page ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
