import { LOCALE_TAGS, type Locale } from "./locales";

/**
 * Formatage des nombres et des dates selon la langue.
 *
 * Point unique : plus aucun `"fr-FR"` ni `.replace(".", ",")` ne doit s'écrire ailleurs
 * dans le périmètre traduit. Les unités et les tournures (« points », « 1er juin »)
 * relèvent des messages, pas d'ici — seule la date longue fait exception, parce que
 * l'ordinal du premier du mois est une règle de la langue et non d'une phrase.
 */
export interface Format {
  locale: Locale;
  /** Balise BCP 47, pour les rares appels directs à `Intl`. */
  tag: string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  /** Entier avec séparateur de milliers. */
  int(value: number): string;
  /**
   * Nombre groupé par milliers avec des espaces ordinaires. `toLocaleString("fr-FR")`
   * pose des espaces insécables fines, que certaines polices (dont celles du PDF) n'ont
   * pas ; les langues qui groupent par virgule ne sont pas concernées.
   */
  spaced(value: number): string;
  /** Au plus `maxDigits` décimales ; `minDigits` pour forcer « 4,50 ». */
  decimal(value: number, maxDigits: number, minDigits?: number): string;
  /**
   * Exactement `digits` décimales, arrondies comme `toFixed` — et non comme `Intl`, qui
   * tranche autrement les demis (15,45 → « 15,4 » ici, « 15,5 » là). À garder pour les
   * chiffres déjà publiés avec cet arrondi, sans séparateur de milliers.
   */
  fixed(value: number, digits: number): string;
  /** « 1er juin 2026 » / « 1 June 2026 ». Accepte une date ISO (`2026-06-01`), lue en UTC. */
  dateLong(date: Date | string): string;
  /** Catégorie de pluriel de la langue : en français, `one` jusqu'à 2 exclu. */
  plural(value: number): Intl.LDMLPluralRule;
}

export function createFormat(locale: Locale): Format {
  const tag = LOCALE_TAGS[locale];
  const pluralRules = new Intl.PluralRules(tag);
  const decimalSeparator = (1.1).toLocaleString(tag).charAt(1);

  const number: Format["number"] = (value, options) => value.toLocaleString(tag, options);

  return {
    locale,
    tag,
    number,
    int: (value) => number(Math.round(value)),
    spaced: (value) => number(value).replace(/[\u202f\u00a0]/g, " "),
    decimal: (value, maxDigits, minDigits = 0) =>
      number(value, { maximumFractionDigits: maxDigits, minimumFractionDigits: minDigits }),
    fixed: (value, digits) => value.toFixed(digits).replace(".", decimalSeparator),
    dateLong: (date) => {
      const iso = typeof date === "string";
      const value = iso ? new Date(`${date}T00:00:00Z`) : date;
      const text = value.toLocaleDateString(tag, {
        day: "numeric",
        month: "long",
        year: "numeric",
        ...(iso ? { timeZone: "UTC" } : {}),
      });
      return locale === "fr" ? text.replace(/^1 /, "1er ") : text;
    },
    plural: (value) => pluralRules.select(value),
  };
}
