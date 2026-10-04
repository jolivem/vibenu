import { Document, Page, Text, View } from "@react-pdf/renderer";
import type {
  CardInsights,
  LocationAnalysisDto,
  RealEstateAnalysisDto,
  SecurityRating,
} from "@/types/location-analysis";
import type { AnalysisMessages } from "@/i18n/messages/fr/analysis";
import { buildKeyFigures } from "@/components/analysis/keyFiguresModel";
import { hasLocalTaxContent } from "@/components/analysis/localTaxModel";
import { SECTION_ORDER, type SectionId } from "@/components/analysis/sections";
import "./registerFonts";
import { PdfMessagesProvider } from "./pdfMessages";
import { pdfStyles } from "./pdfStyles";
import { PdfMap } from "./sections/PdfMap";
import {
  PdfDeplacerFiche,
  PdfElectionsFiche,
  PdfEnvironnementFiche,
  PdfImmobilierFiche,
  PdfKeyFigures,
  PdfPopulationFiche,
  PdfProximiteFiche,
  PdfRisquesFiche,
  PdfSecuriteFiche,
} from "./sections/PdfFiche";
import { BRANDING, FEATURES } from "@/lib/site-features";

interface Props {
  data: LocationAnalysisDto;
  realEstate: RealEstateAnalysisDto | null;
  mapDataUrl: string | null;
  insights: CardInsights;
  generatedAt: Date;
  /** Note de sécurité du bandeau de chiffres clés, rendue avec les « En bref ». */
  securityRating?: SecurityRating;
  /** Adresse de la page d'analyse, citée en pied de fiche pour le détail. */
  pageUrl?: string;
  /** Messages de l'analyse dans la langue de la page : le PDF est rendu hors du DOM. */
  m: AnalysisMessages;
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

/** En-tête répété à partir de la deuxième page : la première porte l'en-tête de la fiche. */
function RunningHeader({ place, eyebrow }: { place: string; eyebrow: string }) {
  return (
    <View
      fixed
      render={({ pageNumber }) =>
        pageNumber === 1 ? null : (
          <View style={pdfStyles.runningHeader}>
            <Text style={pdfStyles.runningHeaderLabel}>{eyebrow}</Text>
            <Brand small />
            <Text style={pdfStyles.runningHeaderLabelRight}>{place}</Text>
          </View>
        )
      }
    />
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Pied de page fixe, numéroté à la page physique : `fixed` le répète sur chaque page
 * produite, et `render` lit le numéro et le total une fois la mise en page faite.
 */
function RunningFooter({ date, address }: { date: string; address: string }) {
  return (
    <View style={pdfStyles.runningFooter} fixed>
      <Text style={pdfStyles.runningFooterDate}>{date}</Text>
      <Text style={pdfStyles.runningFooterAddress}>{address}</Text>
      <Text
        style={pdfStyles.runningFooterPage}
        render={({ pageNumber, totalPages }) => `${pad(pageNumber)} / ${pad(totalPages)}`}
      />
    </View>
  );
}

/**
 * La fiche de synthèse : ce qu'on emporte en visite, qu'on transmet à un banquier ou qu'on
 * pose à côté d'une autre adresse.
 *
 * Elle succède à un dossier de onze pages qui recopiait l'écran — cards, graphes, notes de
 * méthode. Sur papier, on retient et on compare ; on n'explore pas. La fiche garde donc,
 * dans l'ordre de l'écran, un bloc par section : son « En bref » et quelques faits
 * (cf. `PdfFiche`). Graphes, cartes et listes complètes restent en ligne, et le pied de
 * fiche en donne l'adresse.
 */
export function AnalysisPdfDocument({
  data,
  realEstate,
  mapDataUrl,
  insights,
  generatedAt,
  securityRating,
  pageUrl,
  m,
}: Props) {
  const formattedDate = m.pdf.date(generatedAt);

  const { street, locality } = splitAddress(
    data.address.label,
    data.address.city,
    data.address.postcode,
  );

  const showMap = FEATURES.showLocation && Boolean(mapDataUrl);
  const showRealEstate = FEATURES.showRealEstate && Boolean(realEstate);
  const showCadastre = FEATURES.showCadastre && Boolean(data.cadastre);
  const localTax = FEATURES.showLocalTax && hasLocalTaxContent(data.localTax) ? data.localTax : null;
  const showNeighborhood = FEATURES.showNeighborhood && data.mode !== "commune";
  const showSchoolSector = FEATURES.showSchoolSector && Boolean(data.schoolSector);
  const showCommuneEquipment =
    FEATURES.showCommuneEquipment && data.mode === "commune" && Boolean(data.communeEquipment);
  const showSecurity = FEATURES.showSecurity && Boolean(data.security?.indicateurs.length);
  const showMunicipales = FEATURES.showMunicipales && Boolean(data.municipales?.listes.length);
  const showElections = FEATURES.showElections && Boolean(data.elections);
  const showClimate = FEATURES.showClimate && Boolean(data.climate);
  const showAirQuality = FEATURES.showAirQuality && data.airQuality.available;

  // Mêmes conditions que `hasContent` dans `AnalysisScreen`, une section par entrée.
  const sections: Record<SectionId, boolean> = {
    immobilier: showRealEstate || showCadastre || Boolean(localTax),
    proximite: showNeighborhood || showSchoolSector || showCommuneEquipment,
    deplacer: FEATURES.showMobility,
    securite: showSecurity,
    population:
      Boolean(data.demographics) &&
      (FEATURES.showDemographics ||
        (FEATURES.showHousing && Boolean(data.demographics?.housing)) ||
        (FEATURES.showEmployment && Boolean(data.demographics?.employment)) ||
        (FEATURES.showHouseholds && Boolean(data.demographics?.households))),
    elections: showElections || showMunicipales,
    environnement: showClimate || showAirQuality,
    risques: FEATURES.showRisks,
    histoire: false,
  };
  const activeSections = SECTION_ORDER.filter((id) => sections[id]);

  // Les tuiles du bandeau de l'écran, et la surface de la parcelle juste après le prix :
  // les deux chiffres qu'on compare d'une adresse à l'autre.
  const figures: Array<{ section: string; label: string; value: string }> = buildKeyFigures(
    data,
    securityRating,
    activeSections,
    m.keyFigures,
  );
  if (showCadastre && data.cadastre?.parcel) {
    // La surface suit la tuile de prix, repérée par sa section et non par son libellé.
    const afterPrice = figures.findIndex((f) => f.section === "immobilier") + 1;
    figures.splice(afterPrice, 0, { section: "immobilier", label: m.keyFigures.surfaceLabel, value: m.cadastre.surface(data.cadastre.parcel.contenance) });
  }

  return (
    <Document
      title={m.pdf.documentTitle(data.address.label)}
      author={BRANDING.name}
      subject={m.pdf.subject}
    >
      <Page size="A4" style={pdfStyles.page}>
        <RunningHeader place={locality} eyebrow={m.pdf.eyebrow} />
        <RunningFooter date={formattedDate} address={street} />

        <View wrap={false}>
          <View style={pdfStyles.coverTop}>
            <Brand />
            <Text style={pdfStyles.coverStamp}>{formattedDate}</Text>
          </View>
          <Text style={pdfStyles.coverEyebrow}>{m.pdf.eyebrow}</Text>
          <View style={pdfStyles.coverEyebrowRule} />
          <Text style={pdfStyles.coverTitle}>{street}</Text>
          <Text style={pdfStyles.coverSubtitle}>{locality}</Text>
          <PdfKeyFigures figures={figures} />
          {showMap && mapDataUrl && <PdfMap mapDataUrl={mapDataUrl} />}
        </View>

        <PdfMessagesProvider value={m}>
        {sections.immobilier && (
          <PdfImmobilierFiche
            realEstate={showRealEstate ? realEstate : null}
            cadastre={showCadastre ? data.cadastre : null}
            localTax={localTax}
            localTaxInsight={insights.fiscalite}
          />
        )}

        {sections.proximite && (
          <PdfProximiteFiche
            neighborhood={showNeighborhood ? data.neighborhood : null}
            schoolSector={showSchoolSector ? (data.schoolSector ?? null) : null}
            communeEquipment={showCommuneEquipment ? (data.communeEquipment ?? null) : null}
          />
        )}

        {sections.deplacer && <PdfDeplacerFiche mobility={data.mobility} mode={data.mode} />}

        {sections.securite && <PdfSecuriteFiche insight={insights.securite} />}

        {sections.population && data.demographics && (
          <PdfPopulationFiche
            demographics={data.demographics}
            mode={data.mode}
            insights={insights}
            show={{
              demographics: FEATURES.showDemographics,
              employment: FEATURES.showEmployment,
              households: FEATURES.showHouseholds,
              housing: FEATURES.showHousing,
            }}
          />
        )}

        {sections.elections && (
          <PdfElectionsFiche
            municipales={showMunicipales ? (data.municipales ?? null) : null}
            elections={showElections ? (data.elections ?? null) : null}
            insights={insights}
          />
        )}

        {sections.environnement && (
          <PdfEnvironnementFiche
            climate={showClimate ? (data.climate ?? null) : null}
            airQuality={showAirQuality ? data.airQuality : null}
            insight={insights.climat}
          />
        )}

        {sections.risques && <PdfRisquesFiche risks={data.risks} />}
        </PdfMessagesProvider>

        {/* Une seule fois pour toute la fiche, là où chaque card portait ses notes. */}
        <View wrap={false} style={pdfStyles.ficheNotes}>
          <Text style={pdfStyles.ficheNote}>{m.pdf.notes.origin}</Text>
          <Text style={pdfStyles.ficheNote}>{m.pdf.notes.sources}</Text>
          {pageUrl && (
            <Text style={pdfStyles.ficheNote}>
              {m.pdf.notes.onlineLead}
              <Text style={pdfStyles.ficheLink}>{pageUrl}</Text>
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
