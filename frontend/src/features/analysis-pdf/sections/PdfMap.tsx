import { Image, View } from "@react-pdf/renderer";
import { pdfStyles } from "../pdfStyles";

export function PdfMap({ mapDataUrl }: { mapDataUrl: string }) {
  return (
    <View wrap={false}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={mapDataUrl} style={pdfStyles.mapImage} />
    </View>
  );
}
