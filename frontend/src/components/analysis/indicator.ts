import type {
  IndicatorComparison,
  IndicatorFormat,
  IndicatorKey,
} from "@/i18n/messages/fr/analysis/population";
import type { Rich } from "@/i18n/types";
import type { InseeView } from "./inseeChart";

/**
 * Un indicateur scalaire de la rubrique Population : sa clé (titre et dénominateur vivent
 * dans les messages), sa valeur, son format et la façon de le comparer à la France.
 * Logique pure, partagée par `IndicatorBlock` (écran) et la fiche PDF ; les textes
 * viennent de `view.m`, donc de la langue de la vue.
 */
export interface Indicator<T> {
  key: IndicatorKey;
  pick: (stats: T) => number | null;
  /** Rendu d'une valeur avec son unité — pourcentage, revenu, densité… */
  format: IndicatorFormat;
  /**
   * Comparaison au national.
   *
   * Par défaut l'écart en points de pourcentage, ce qui suppose que l'indicateur en est
   * un. Une grandeur qui se compare autrement le dit — un revenu en écart d'euros
   * (`absolute`), une densité en rapport (`ratio`) : « 479 fois la moyenne française »
   * se lit, alors que « 50 615 hab./km² de plus » ne veut rien dire à l'œil.
   */
  comparison?: "ratio" | "absolute";
}

function compare<T>(
  indicator: Indicator<T>,
  view: InseeView<T>,
  local: number,
  france: number,
): IndicatorComparison {
  const format = view.m.format[indicator.format];
  const ref = format(france);

  // Égalité jugée sur la valeur affichée : un écart qui disparaît à l'arrondi ne mérite
  // pas « 0 point de plus ».
  if (format(local) === ref) return { kind: "same", ref };

  if (indicator.comparison === "ratio") {
    if (france === 0) return { kind: "versus", ref };
    // Une décimale sous 10, l'entier au-delà : « 3,3 fois » dit quelque chose, « 478,5
    // fois » feint une précision que le rapport de deux agrégats n'a pas.
    const ratio = local >= france ? local / france : france / local;
    const times = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
    return { kind: "ratio", times, more: local >= france, ref };
  }

  const gap = Math.abs(local - france);
  return {
    kind: "gap",
    gap: indicator.comparison === "absolute" ? format(gap) : view.m.points(gap),
    more: local > france,
    ref,
  };
}

/**
 * Titre, dénominateur et phrase d'un indicateur — « **12 %** ici, soit 3 points de plus
 * qu'en France (9 %), et 10 % à Lyon. » — ou `null` sans valeur locale : le bloc
 * disparaît alors entièrement, titre compris, plutôt que d'afficher un titre suivi d'un
 * tiret. C'est le cas courant des IRIS ruraux peu peuplés, pour lesquels INSEE ne publie
 * ni revenu ni taux de pauvreté.
 */
export function describeIndicator<T>(
  indicator: Indicator<T>,
  view: InseeView<T>,
): { title: string; unit: string; sentence: Rich } | null {
  const local = view.scoped.iris ? indicator.pick(view.scoped.iris) : null;
  if (local == null) return null;

  const format = view.m.format[indicator.format];
  const france = view.scoped.france ? indicator.pick(view.scoped.france) : null;
  const commune =
    view.showCommune && view.scoped.commune ? indicator.pick(view.scoped.commune) : null;

  return {
    ...view.m.indicators[indicator.key],
    sentence: view.m.sentence({
      value: format(local),
      comparison: france != null ? compare(indicator, view, local, france) : null,
      commune: commune != null ? { value: format(commune), name: view.communeName } : null,
    }),
  };
}

/**
 * « Revenu médian 38 960 €/an (France 23 323 €/an) » — la version resserrée de
 * `describeIndicator`, pour la fiche PDF où la place est comptée. `null` sans valeur
 * locale, pour la même raison.
 */
export function compactIndicator<T>(indicator: Indicator<T>, view: InseeView<T>): string | null {
  const local = view.scoped.iris ? indicator.pick(view.scoped.iris) : null;
  if (local == null) return null;
  const format = view.m.format[indicator.format];
  const france = view.scoped.france ? indicator.pick(view.scoped.france) : null;
  return view.m.compact(
    view.m.indicators[indicator.key].title,
    format(local),
    france != null ? format(france) : null,
  );
}
