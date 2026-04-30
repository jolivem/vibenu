import { Text, View } from "@react-pdf/renderer";
import type { SummaryDto } from "@/types/location-analysis";
import { pdfStyles } from "../pdfStyles";

interface Props {
  summary: SummaryDto;
  narrativeParagraph: string | null;
}

export function PdfCoverResume({ summary, narrativeParagraph }: Props) {
  const lede = narrativeParagraph?.trim() || summary.shortText;

  return (
    <View style={pdfStyles.resumeBlock} wrap={false}>
      <Text style={pdfStyles.resumeEyebrow}>Le résumé</Text>
      <Text style={pdfStyles.resumeTitle}>{summary.shortText}</Text>
      {lede && lede !== summary.shortText && (
        <Text style={pdfStyles.resumeLede}>{lede}</Text>
      )}
      <View style={pdfStyles.resumeColsWrap}>
        {summary.strengths.length > 0 && (
          <View style={pdfStyles.resumeCol}>
            <Text style={pdfStyles.resumeColTitle}>Points forts</Text>
            {summary.strengths.map((item) => (
              <View key={item} style={pdfStyles.resumeBullet}>
                <Text style={pdfStyles.resumeBulletDot}>•</Text>
                <Text style={pdfStyles.resumeBulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
        {summary.warnings.length > 0 && (
          <View style={pdfStyles.resumeCol}>
            <Text style={pdfStyles.resumeColTitle}>À vérifier</Text>
            {summary.warnings.map((item) => (
              <View key={item} style={pdfStyles.resumeBullet}>
                <Text style={pdfStyles.resumeBulletDot}>•</Text>
                <Text style={pdfStyles.resumeBulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
