import type { ReactNode } from "react";
import type { InseeView } from "./inseeChart";

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
 * `unit` porte le dénominateur, à l'endroit où il se lit, plutôt qu'une note commune en
 * bas de card : deux taux de la même card n'ont pas forcément la même population de
 * référence.
 */
export interface Indicator<T> {
  key: string;
  title: string;
  unit: string;
  pick: (stats: T) => number | null;
  /** Rendu d'une valeur avec son unité — `formatPct`, `formatRevenu`… */
  format: (value: number) => string;
  /**
   * Clause de comparaison au national, insérée après la valeur locale.
   *
   * Par défaut l'écart en points de pourcentage, ce qui suppose que l'indicateur en est
   * un. Une grandeur qui se compare autrement fournit la sienne — un revenu en écart
   * d'euros, une densité en rapport : « 479 fois la moyenne française » se lit, alors
   * que « 50 615 hab./km² de plus » ne veut rien dire à l'œil.
   */
  comparison?: (local: number, france: number) => string;
}

/** « 1,5 point », « 2,4 points » — le singulier tient jusqu'à deux exclus. */
function formatPoints(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const number = rounded.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return `${number} ${rounded < 2 ? "point" : "points"}`;
}

function signedClause(gap: string, local: number, france: number, reference: string): string {
  return ` soit ${gap} ${local > france ? "de plus" : "de moins"} qu'en France (${reference})`;
}

/** Comparaison par défaut : l'écart en points de pourcentage. */
function pointsComparison(format: (v: number) => string) {
  return (local: number, france: number) =>
    signedClause(formatPoints(Math.abs(local - france)), local, france, format(france));
}

/**
 * Comparaison en rapport, pour les grandeurs dont l'écart absolu ne se lit pas.
 *
 * Une décimale sous 10, l'entier au-delà : « 3,3 fois » dit quelque chose, « 478,5 fois »
 * feint une précision que le rapport de deux agrégats n'a pas.
 */
export function ratioComparison(format: (v: number) => string) {
  return (local: number, france: number) => {
    if (france === 0) return ` contre ${format(france)} en France`;
    const ratio = local >= france ? local / france : france / local;
    const rounded = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
    const number = rounded.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
    const sens = local >= france ? "" : " moins";
    return ` soit ${number} fois${sens} la moyenne française (${format(france)})`;
  };
}

/** Comparaison en écart d'unités, pour une grandeur qui n'est pas un pourcentage. */
export function absoluteComparison(format: (v: number) => string) {
  return (local: number, france: number) =>
    signedClause(format(Math.abs(local - france)), local, france, format(france));
}

/**
 * Rend `null` sans valeur locale — le bloc disparaît alors entièrement, titre compris,
 * plutôt que d'afficher un titre suivi d'un tiret. C'est le cas courant des IRIS ruraux
 * peu peuplés, pour lesquels INSEE ne publie ni revenu ni taux de pauvreté.
 */
export function IndicatorBlock<T>({
  indicator,
  view,
}: {
  indicator: Indicator<T>;
  view: InseeView<T>;
}): ReactNode {
  const local = view.scoped.iris ? indicator.pick(view.scoped.iris) : null;
  if (local == null) return null;

  const { format } = indicator;
  const compare = indicator.comparison ?? pointsComparison(format);
  const france = view.scoped.france ? indicator.pick(view.scoped.france) : null;
  const commune =
    view.showCommune && view.scoped.commune ? indicator.pick(view.scoped.commune) : null;

  let comparison = "";
  if (france != null) {
    // Égalité jugée sur la valeur affichée : un écart qui disparaît à l'arrondi ne
    // mérite pas « 0 point de plus ».
    comparison =
      format(local) === format(france)
        ? ` au même niveau qu'en France (${format(france)})`
        : compare(local, france);
  }

  return (
    <div className="insee-metric">
      <h3>{indicator.title}</h3>
      <p className="insee-metric-unit">{indicator.unit}</p>
      <p className="insee-prose">
        {/* « ici » plutôt que « dans ce quartier » : le même mot vaut pour une adresse
            et pour une commune, comme dans le prompt des mini-synthèses. */}
        <strong>{format(local)}</strong> ici
        {comparison && <>,{comparison}</>}
        {commune != null && <>, et {format(commune)} à {view.communeName}</>}.
      </p>
    </div>
  );
}
