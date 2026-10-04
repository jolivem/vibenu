import type { ReactNode } from "react";
import { RichText } from "@/components/RichText";
import type { InseeView } from "./inseeChart";
import { describeIndicator, type Indicator } from "./indicator";

export { type Indicator } from "./indicator";

/**
 * Un indicateur scalaire de la rubrique Population, rendu comme un graphe : titre,
 * dénominateur, contenu.
 *
 * Ces valeurs étaient tabulées en libellé-valeur, ce qui les faisait lire comme une
 * annexe des graphes voisins alors qu'elles sont de même rang — le taux de chômage n'est
 * pas une métadonnée des catégories socioprofessionnelles. Chacune reçoit donc le
 * gabarit exact d'un `.insee-metric`, à ceci près que le contenu est une phrase : un taux
 * et son écart se disent en moins de place qu'ils n'en prennent en tableau.
 *
 * La logique — valeur, comparaison, commune — vit dans `indicator.ts`, partagée avec
 * le PDF ; la phrase elle-même vient des messages de la vue.
 */
export function IndicatorBlock<T>({
  indicator,
  view,
}: {
  indicator: Indicator<T>;
  view: InseeView<T>;
}): ReactNode {
  const described = describeIndicator(indicator, view);
  if (!described) return null;

  return (
    <div className="insee-metric">
      <h3>{described.title}</h3>
      <p className="metric-unit">{described.unit}</p>
      <p className="insee-prose">
        <RichText text={described.sentence} />
      </p>
    </div>
  );
}
