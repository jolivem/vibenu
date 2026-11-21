import {
  VerticalBars,
  type VerticalBarReference,
  type VerticalBarRow,
} from "@/components/commune/VerticalBars";
import {
  ComparisonTable,
  type ComparisonTableColumn,
  type ComparisonTableRow,
} from "@/components/commune/ComparisonTable";

/**
 * Un classement d'article : les barres du comparatif des arrondissements, puis le tableau
 * triable, ouvert (c'est le contenu de l'article, pas une annexe repliée).
 *
 * Tout arrive formaté par le `figures.tsx` de l'article, qui lit son instantané.
 */
export function Classement({
  titre,
  barres,
  references = [],
  table,
}: {
  titre: string;
  barres: VerticalBarRow[];
  references?: VerticalBarReference[];
  table: {
    caption: string;
    enteteLieu: string;
    colonnes: ComparisonTableColumn[];
    lignes: ComparisonTableRow[];
    references?: Array<{ id: string; nom: string; cellules: string[] }>;
  };
}) {
  return (
    <section className="article-classement">
      <h3>{titre}</h3>
      <VerticalBars rows={barres} references={references} label={titre} />
      <ComparisonTable
        caption={table.caption}
        enteteLieu={table.enteteLieu}
        ordreInitial="Ordre de l'article"
        colonnes={table.colonnes}
        lignes={table.lignes}
        references={table.references ?? []}
      />
    </section>
  );
}
