/**
 * Les phrases du comparatif des arrondissements : chapeau, une phrase par section, FAQ et
 * méta-description. TypeScript lit les extrêmes, la phrase les dit — aucun modèle ici.
 *
 * Les questions de la FAQ ne reprennent pas celles du hub (« le plus cher », « le plus
 * peuplé ») : deux pages qui répondent à la même question se font concurrence.
 */

import { CITIES, type City } from "@/lib/commune-slugs";
import { createFormat } from "@/i18n/format";
import { comparison as m } from "@/i18n/messages/fr/analysis/comparison";
import { valeursDe } from "@/lib/comparison/build";
import { formatCellule } from "@/lib/comparison/format";
import { extremes, rapport } from "@/lib/comparison/rank";
import type { Comparaison, IndicateurComparableId, ReferenceKind } from "@/lib/comparison/types";
import { COMMUNE_INDICATEURS } from "./communeIndicators";
import type { ComparatifThemeId } from "./comparatifSections";
import type { FaqItem } from "./CommuneFaqSection";

const fmt = createFormat("fr");

/** « 10 520 €/m² », ou le nombre seul avec l'unité donnée (« 12,3 pour 1 000 logements »). */
function texte(id: IndicateurComparableId, valeur: number, unite?: (n: string) => string): string {
  const ind = COMMUNE_INDICATEURS[id];
  if (unite) return unite(fmt.decimal(valeur, ind.decimales, ind.decimales));
  return formatCellule({ valeur, masque: false }, ind.unite, ind.decimales, fmt, m);
}

interface Plage {
  max: string;
  maxNom: string;
  min: string;
  minNom: string;
  rapport: number | null;
}

function plage(c: Comparaison, id: IndicateurComparableId, unite?: (n: string) => string): Plage | null {
  const e = extremes(valeursDe(c, id));
  if (!e) return null;
  return {
    max: texte(id, e.max.valeur, unite),
    maxNom: c.lieux[e.max.index].nom,
    min: texte(id, e.min.valeur, unite),
    minNom: c.lieux[e.min.index].nom,
    rapport: rapport(e),
  };
}

function reference(c: Comparaison, id: IndicateurComparableId, kind: ReferenceKind): number | null {
  return c.references.find((r) => r.kind === kind)?.cellules[id] ?? null;
}

/** « Le revenu médian va de 21 000 € (Paris 19e) à 54 000 € (Paris 7e). » — vide sans plage. */
function vaDe(sujet: string, p: Plage | null, verbe = "va", suite = ""): string {
  if (!p) return "";
  return `${sujet} ${verbe} de ${p.min} (${p.minNom}) à ${p.max} (${p.maxNom})${suite}.`;
}

const pour1000 = (base: string) => (n: string) => `${n} pour 1 000 ${base}`;

/** L'année des chiffres de délinquance, la même pour tous les arrondissements. */
export function anneeSecurite(annees: number[] | undefined): number | null {
  return annees && annees.length > 0 ? annees[annees.length - 1] : null;
}

/** La phrase chiffrée en tête de chaque section. */
export function phraseTheme(
  c: Comparaison,
  theme: ComparatifThemeId,
  annee: number | null,
): string {
  switch (theme) {
    case "achat-location": {
      const prix = plage(c, "prixAppartement");
      const fois =
        prix?.rapport && prix.rapport >= 1.2
          ? `, soit ${fmt.decimal(prix.rapport, 1, 1)} fois plus cher au m²`
          : "";
      return [
        vaDe("Le prix médian d'un appartement", prix, "va", fois),
        vaDe("Le loyer d'annonce d'un appartement", plage(c, "loyerAppartement"), "va", " par mois"),
      ]
        .filter(Boolean)
        .join(" ");
    }
    case "population":
      return [
        vaDe("Le revenu médian annuel", plage(c, "revenuMedian")),
        vaDe("La part des habitants sous le seuil de pauvreté", plage(c, "tauxPauvrete")),
      ]
        .filter(Boolean)
        .join(" ");
    case "ages-familles":
      return [
        vaDe("La part des enfants de 0 à 14 ans", plage(c, "part0_14")),
        vaDe("Celle des ménages formés d'un couple avec enfants", plage(c, "couplesAvecEnfants")),
        vaDe("Celle des 75 ans et plus", plage(c, "part75Plus")),
      ]
        .filter(Boolean)
        .join(" ");
    case "logement":
      return [
        vaDe("La part des propriétaires", plage(c, "proprietaires")),
        vaDe("Celle des HLM", plage(c, "hlm")),
      ]
        .filter(Boolean)
        .join(" ");
    case "emploi":
      return [
        vaDe("Le taux de chômage déclaré au recensement", plage(c, "chomage")),
        vaDe("La part des diplômés du supérieur", plage(c, "diplomesSuperieur")),
      ]
        .filter(Boolean)
        .join(" ");
    case "securite": {
      const cambriolages = vaDe(
        `En ${annee ?? "dernière année"}, les cambriolages enregistrés`,
        plage(c, "cambriolages", pour1000("logements")),
        "vont",
      );
      // Un taux par habitant gonfle là où l'on travaille et sort sans habiter : à dire, sans
      // quoi les arrondissements centraux se lisent comme les plus dangereux.
      return [
        cambriolages,
        "Les taux sont rapportés aux habitants ou aux logements : là où l'on vient travailler ou sortir sans y habiter, ils sont mécaniquement plus élevés.",
      ]
        .filter(Boolean)
        .join(" ");
    }
    case "elections":
      return vaDe(
        "Au 1er tour de la présidentielle 2022, la participation",
        plage(c, "participationPresidentielle"),
        "est allée",
      );
  }
}

/** Les taux de délinquance, le nombre de faits qui les porte et le dénominateur. */
const COMPTES: Partial<Record<IndicateurComparableId, { faits: IndicateurComparableId; base: string }>> = {
  cambriolages: { faits: "cambriolagesFaits", base: "logements" },
  violencesPhysiques: { faits: "violencesPhysiquesFaits", base: "habitants" },
  volsDansVehicules: { faits: "volsDansVehiculesFaits", base: "habitants" },
};

function indexMax(valeurs: Array<number | null>): number | null {
  let best: number | null = null;
  valeurs.forEach((v, i) => {
    if (v !== null && (best === null || v > (valeurs[best] as number))) best = i;
  });
  return best;
}

/**
 * Sous un graphe de délinquance dont le taux le plus haut dépasse le double de celui de la
 * ville : le nombre de faits et le dénominateur de cet arrondissement, mis à côté de ceux de
 * l'arrondissement qui compte le plus de faits. Des chiffres côte à côte, aucune cause : le
 * lecteur voit qu'un taux par habitant grossit là où l'on habite peu.
 *
 * Le dénominateur est celui que publie le SSMSI, pas un recalcul depuis le taux arrondi.
 */
export function noteTaux(
  c: Comparaison,
  id: IndicateurComparableId,
  /** Dénominateur publié de chaque lieu, dans l'ordre de `c.lieux`. */
  denominateurs: Array<number | null>,
): string | null {
  const compte = COMPTES[id];
  if (!compte) return null;
  const taux = valeursDe(c, id);
  const faits = valeursDe(c, compte.faits);
  const e = extremes(taux);
  const repere = reference(c, id, "ville");
  if (!e || repere === null || repere <= 0 || e.max.valeur <= 2 * repere) return null;

  const decrire = (i: number, tournure: "compte" | "en compte") => {
    const f = faits[i];
    const d = denominateurs[i];
    if (f === null || d === null) return null;
    return tournure === "compte"
      ? `${c.lieux[i].nom} compte ${fmt.int(f)} faits pour ${fmt.int(d)} ${compte.base}`
      : `${c.lieux[i].nom} en compte ${fmt.int(f)} pour ${fmt.int(d)} ${compte.base}`;
  };

  const i = e.max.index;
  // L'arrondissement qui a le plus de faits ; si c'est le même, le plus peuplé.
  let j = indexMax(faits);
  if (j === i) j = indexMax(denominateurs);
  const premier = decrire(i, "compte");
  if (!premier) return null;
  const second = j !== null && j !== i ? decrire(j, "en compte") : null;
  return `Derrière les taux : ${premier}${second ? ` ; ${second}` : ""}.`;
}

/** Le chapeau : ce que l'on compare, puis les deux écarts que le lecteur cherche. */
export function chapeauComparatif(city: City, c: Comparaison): string {
  const ville = CITIES[city].nomAffiche;
  const parts = [
    `Prix, loyers, revenus, logement, emploi et sécurité : les ${c.lieux.length} arrondissements de ${ville} côte à côte, avec les mêmes sources publiques que leurs pages.`,
  ];
  const prix = plage(c, "prixAppartement");
  if (prix) {
    parts.push(
      `Le plus cher à l'achat est ${prix.maxNom} (${prix.max}), le moins cher ${prix.minNom} (${prix.min}).`,
    );
  }
  const revenu = plage(c, "revenuMedian");
  if (revenu) {
    parts.push(
      `Le revenu médian le plus élevé est celui de ${revenu.maxNom} (${revenu.max} par an), le plus bas celui de ${revenu.minNom} (${revenu.min}).`,
    );
  }
  return parts.join(" ");
}

/** La méta-description, sous 160 caractères : la plage des prix d'abord. */
export function descriptionComparatif(city: City, c: Comparaison): string {
  const ville = CITIES[city].nomAffiche;
  const prix = plage(c, "prixAppartement");
  const tete = prix
    ? `Appartement de ${prix.min} (${prix.minNom}) à ${prix.max} (${prix.maxNom}). `
    : "";
  return `${tete}Prix, loyers, revenus, logement et sécurité : les ${c.lieux.length} arrondissements de ${ville} comparés et classés.`;
}

export function faqComparatif(city: City, c: Comparaison, annee: number | null): FaqItem[] {
  const ville = CITIES[city].nomAffiche;
  const items: FaqItem[] = [];

  // Le classement complet : la requête « classement arrondissement » appelle une liste.
  const prix = valeursDe(c, "prixAppartement");
  const classes = c.lieux
    .map((l, i) => ({ nom: l.nom, v: prix[i] }))
    .filter((x): x is { nom: string; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v);
  if (extremes(prix)) {
    const repere = reference(c, "prixAppartement", "ville");
    items.push({
      question: `Quel est le classement des arrondissements de ${ville} par prix au m² ?`,
      answer: `Du plus cher au moins cher, en prix médian d'un appartement sur 24 mois : ${classes
        .map((x, i) => `${i + 1}. ${x.nom}, ${texte("prixAppartement", x.v)}`)
        .join(" ; ")}.${repere !== null ? ` Sur l'ensemble de ${ville}, la médiane est de ${texte("prixAppartement", repere)}.` : ""} Source : DVF.`,
    });
  }

  const revenu = plage(c, "revenuMedian");
  if (revenu) {
    const france = reference(c, "revenuMedian", "france");
    items.push({
      question: `Quel est l'arrondissement le plus aisé de ${ville} ?`,
      answer: `${revenu.maxNom}, avec un revenu médian de ${revenu.max} par an et par unité de consommation. Le plus modeste est ${revenu.minNom} (${revenu.min}).${france !== null ? ` En France, le revenu médian est de ${texte("revenuMedian", france)}.` : ""} Source : INSEE, Filosofi.`,
    });
  }

  const cambriolages = plage(c, "cambriolages", pour1000("logements"));
  if (cambriolages) {
    const v = reference(c, "cambriolages", "ville");
    const f = reference(c, "cambriolages", "france");
    const reperes = [
      v !== null ? `${ville} : ${texte("cambriolages", v, pour1000("logements"))}` : null,
      f !== null ? `France : ${texte("cambriolages", f, pour1000("logements"))}` : null,
    ].filter(Boolean);
    items.push({
      question: `Dans quel arrondissement de ${ville} y a-t-il le moins de cambriolages ?`,
      answer: `${cambriolages.minNom}, avec ${cambriolages.min} cambriolages enregistrés${annee ? ` en ${annee}` : ""}. Le taux le plus élevé est celui de ${cambriolages.maxNom} (${cambriolages.max}).${reperes.length > 0 ? ` Repères : ${reperes.join(" ; ")}.` : ""} Source : SSMSI, faits enregistrés par la police et la gendarmerie.`,
    });
  }

  const hlm = plage(c, "hlm");
  if (hlm) {
    const france = reference(c, "hlm", "france");
    items.push({
      question: `Quel arrondissement de ${ville} compte le plus de logements sociaux ?`,
      answer: `${hlm.maxNom} : ${hlm.max} des résidences principales y sont louées en HLM, contre ${hlm.min} pour ${hlm.minNom}.${france !== null ? ` En France, la part est de ${texte("hlm", france)}.` : ""} Source : INSEE, recensement.`,
    });
  }

  const chomage = plage(c, "chomage");
  if (chomage) {
    items.push({
      question: `Quel arrondissement de ${ville} a le taux de chômage le plus bas ?`,
      answer: `${chomage.minNom}, avec ${chomage.min} de chômeurs parmi les actifs de 15 à 64 ans, tels que déclarés au recensement. Le plus élevé est celui de ${chomage.maxNom} (${chomage.max}). Source : INSEE.`,
    });
  }

  return items;
}
