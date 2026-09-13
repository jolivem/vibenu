import type { ReactNode } from "react";
import type { InseeView } from "./inseeChart";
import { describeIndicator, type Indicator } from "./indicator";

export { absoluteComparison, ratioComparison, type Indicator } from "./indicator";

/**
 * Un indicateur scalaire de la rubrique Population, rendu comme un graphe : titre,
 * dénominateur, contenu.
 *
 * Ces valeurs étaient tabulées en libellé-valeur, ce qui les faisait lire comme une
 * annexe des graphes voisins alors qu'elles sont de même rang — le taux de chômage n'est
 * pas une métadonnée des catégories socioprofessionnelles. Chacune reçoit donc le
 * gabarit exact d'un `.insee-metric`, à ceci près que le contenu est une phrase : un taux
 * et son écart se disent en français en moins de place qu'ils n'en prennent en tableau.
 *
 * La logique — valeur, comparaison, commune — vit dans `indicator.ts`, partagée avec
 * le PDF.
 *
 * `unit` porte le dénominateur, à l'endroit où il se lit, plutôt qu'une note commune en
 * bas de card : deux taux de la même card n'ont pas forcément la même population de
 * référence.
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
      <h3>{indicator.title}</h3>
      <p className="metric-unit">{indicator.unit}</p>
      <p className="insee-prose">
        {/* « ici » plutôt que « dans ce quartier » : le même mot vaut pour une adresse
            et pour une commune, comme dans le prompt des mini-synthèses. */}
        <strong>{described.value}</strong> ici
        {described.comparison && <>,{described.comparison}</>}
        {described.commune && <>, et {described.commune}</>}.
      </p>
    </div>
  );
}
