import { Image, View } from "@react-pdf/renderer";
import { pdfStyles } from "../pdfStyles";

export function PdfMap({ mapDataUrl }: { mapDataUrl: string }) {
  return (
    // Le liseré est porté par le cadre et non par l'image : react-pdf ne dessine pas la
    // bordure d'une `Image`, et la carte se fondait dans la page.
    <View wrap={false} style={pdfStyles.mapFrame}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={mapDataUrl} style={pdfStyles.mapImage} />
    </View>
  );
}
