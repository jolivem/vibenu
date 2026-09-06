import type { ReactNode } from "react";
import { Text, View } from "@react-pdf/renderer";
import type { AnalysisMode, CardInsights, DemographicsAnalysisDto } from "@/types/location-analysis";
import { formatPct } from "@/components/analysis/demographicsFormat";
import { formatFr } from "@/lib/format";
import { viewForMode, type InseeView } from "@/components/analysis/inseeChart";
import { pdfStyles } from "../pdfStyles";
import { PdfInsight } from "./PdfInsight";

/**
 * Les trois axes INSEE du quartier, en tableaux.
 *
 * Le PDF ne reprend pas les graphes de la page : les distributions par pièce, époque,
 * CSP ou diplôme demanderaient quatre rendus SVG de plus dans un dossier déjà dense.
 * Les indicateurs qui portent un jugement — statut d'occupation, chômage, composition
 * des ménages — y sont, comparés aux mêmes repères qu'à l'écran.
 */

/** Une valeur par ligne du tableau, dans l'ordre de `labels`. */
type Cells<T> = (stats: T) => (string | null)[];

function ScaleTable<T>({
  labels,
  view,
  cells,
}: {
  labels: readonly string[];
  view: InseeView<T>;
  cells: Cells<T>;
}) {
  const { scoped, localName, communeName, showCommune } = view;
  const withCommune = showCommune && scoped.commune !== null;

  const local = scoped.iris ? cells(scoped.iris) : null;
  if (!local) return null;
  const commune = scoped.commune ? cells(scoped.commune) : null;
  const france = scoped.france ? cells(scoped.france) : null;

  return (
    <View style={pdfStyles.demoTable}>
      <View style={pdfStyles.demoTableHead}>
        <Text style={pdfStyles.demoTableHeadCellFirst}>Indicateur</Text>
        <Text style={pdfStyles.demoTableHeadCell}>{localName}</Text>
        {withCommune && <Text style={pdfStyles.demoTableHeadCell}>{communeName}</Text>}
        {france && <Text style={pdfStyles.demoTableHeadCell}>France</Text>}
      </View>
      {labels.map((label, i) => (
        <View key={label} style={pdfStyles.demoTableRow}>
          <Text style={pdfStyles.demoTableCellLabel}>{label}</Text>
          <Text style={pdfStyles.demoTableCellIris}>{local[i] ?? "—"}</Text>
          {withCommune && <Text style={pdfStyles.demoTableCell}>{commune?.[i] ?? "—"}</Text>}
          {france && <Text style={pdfStyles.demoTableCell}>{france[i] ?? "—"}</Text>}
        </View>
      ))}
    </View>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 24 }} wrap={false}>
      <Text style={pdfStyles.chartHead}>{title}</Text>
      {children}
    </View>
  );
}

const HOUSING_LABELS = [
  "Logements",
  "Propriétaires",
  "Locataires du privé",
  "Locataires HLM",
  "Logements vacants",
  "Résidences secondaires",
  "Maisons",
] as const;

const EMPLOYMENT_LABELS = [
  "Taux de chômage",
  "Taux d'activité",
  "Cadres",
  "Ouvriers",
  "Diplômés du supérieur",
] as const;

const HOUSEHOLDS_LABELS = [
  "Ménages",
  "Taille moyenne",
  "Personnes seules",
  "Couples avec enfants",
  "Familles monoparentales",
] as const;

export function PdfInseeProfile({
  demographics,
  mode,
  insights,
}: {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
  /** Mini-synthèses IA : les trois axes sont ici des blocs titrés distincts. */
  insights?: CardInsights;
}) {
  const housing = viewForMode(demographics.housing, mode, demographics);
  const employment = viewForMode(demographics.employment, mode, demographics);
  const households = viewForMode(demographics.households, mode, demographics);
  if (!housing && !employment && !households) return null;

  return (
    <>
      {housing && (
        <Block title="Logement">
          <PdfInsight text={insights?.logement} />
          <ScaleTable
            labels={HOUSING_LABELS}
            view={housing}
            cells={(s) => [
              s.logements == null ? null : formatFr(s.logements),
              formatPct(s.pctProprietaires),
              formatPct(s.pctLocatairesPrives),
              formatPct(s.pctHlm),
              formatPct(s.pctVacants),
              formatPct(s.pctResidencesSecondaires),
              formatPct(s.pctMaisons),
            ]}
          />
        </Block>
      )}

      {employment && (
        <Block title="Emploi et qualifications">
          <PdfInsight text={insights?.emploi} />
          <ScaleTable
            labels={EMPLOYMENT_LABELS}
            view={employment}
            // CS3 = cadres, CS6 = ouvriers dans la nomenclature INSEE.
            cells={(s) => [
              formatPct(s.tauxChomage),
              formatPct(s.tauxActivite),
              formatPct(s.csp?.[2] ?? null),
              formatPct(s.csp?.[5] ?? null),
              formatPct(s.pctDiplomesSuperieur),
            ]}
          />
          <Text style={pdfStyles.demoIris}>
            Chômage au sens du recensement (déclaratif), non comparable au taux BIT.
          </Text>
        </Block>
      )}

      {households && (
        <Block title="Ménages et familles">
          <PdfInsight text={insights?.menages} />
          <ScaleTable
            labels={HOUSEHOLDS_LABELS}
            view={households}
            cells={(s) => [
              s.nombreMenages == null ? null : formatFr(s.nombreMenages),
              s.tailleMoyenne == null
                ? null
                : `${s.tailleMoyenne.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} pers.`,
              formatPct(s.pctPersonnesSeules),
              formatPct(s.pctCouplesAvecEnfants),
              formatPct(s.pctFamillesMonoparentales),
            ]}
          />
        </Block>
      )}
    </>
  );
}
