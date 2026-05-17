import { Text, View } from "@react-pdf/renderer";
import type { SchoolSectorDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

const NIVEAU_LABEL: Record<SchoolSectorDto["niveau"], string> = {
  college: "Collège de secteur",
  lycee: "Lycée de secteur",
};

export function PdfSchoolSector({ schoolSector }: { schoolSector: SchoolSectorDto }) {
  return (
    <View wrap={false}>
      <View style={pdfStyles.cadRow}>
        <Text style={pdfStyles.cadRowKey}>{NIVEAU_LABEL[schoolSector.niveau]}</Text>
        <Text style={pdfStyles.cadRowVal}>{schoolSector.nomEtablissement}</Text>
      </View>
      {schoolSector.adresse && (
        <View style={pdfStyles.cadRow}>
          <Text style={pdfStyles.cadRowKey}>Adresse</Text>
          <Text style={pdfStyles.cadRowVal}>{schoolSector.adresse}</Text>
        </View>
      )}
      {schoolSector.codeUai && (
        <View style={pdfStyles.cadRow}>
          <Text style={pdfStyles.cadRowKey}>Code UAI</Text>
          <Text style={pdfStyles.cadRowVal}>{schoolSector.codeUai}</Text>
        </View>
      )}
    </View>
  );
}
