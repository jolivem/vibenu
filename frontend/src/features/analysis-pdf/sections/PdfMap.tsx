import { Image, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "../pdfStyles";

export function PdfMap({ mapDataUrl, addressLabel }: { mapDataUrl: string; addressLabel: string }) {
  return (
    <View style={pdfStyles.card} wrap={false}>
      <Text style={pdfStyles.cardTitle}>Carte</Text>
      <Text style={[pdfStyles.p, pdfStyles.muted]}>{addressLabel}</Text>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={mapDataUrl} style={pdfStyles.mapImage} />
    </View>
  );
}
