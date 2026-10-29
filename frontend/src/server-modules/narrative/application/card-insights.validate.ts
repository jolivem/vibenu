import type { CardInsightKey, CardInsights } from "@/server-shared/types/card-insights";

/**
 * Relecture des phrases « En bref » après leur rédaction.
 *
 * La consigne ne suffit pas : malgré l'interdiction, le modèle écrivait « les personnes seules y
 * sont majoritaires (46 %) », et « l'ozone dépasse la valeur cible de 25 jours » pour 17 jours
 * (essai du 29/10/2026). Le code tranche donc après coup : une phrase qui cite un nombre absent
 * des faits qu'il a reçus, ou qui parle de majorité sans part au-delà de 50 %, est retirée. La
 * card s'affiche alors sans phrase — comme quand le modèle ne répond pas.
 *
 * Même règle que le contrôle `scripts/verify/checks/insights.py`, qui la vérifie sur le site en
 * ligne.
 */

/** Un nombre écrit à la française : « 2 000 », « 14,6 », « 0,3 ». */
const NUMBER = /(?<![\w,])(\d{1,3}(?:[   ]\d{3})+|\d+)(?:,(\d+))?/g;
const MAJORITY = /majoritaire|majorité|plus de la moitié/i;

function numbersIn(text: string): { value: number; decimals: number }[] {
  const out: { value: number; decimals: number }[] = [];
  for (const m of text.matchAll(NUMBER)) {
    const whole = m[1].replace(/[   ]/g, "");
    const dec = m[2] ?? "";
    out.push({ value: Number(dec ? `${whole}.${dec}` : whole), decimals: dec.length });
  }
  return out;
}

/** Tous les nombres des faits d'une rubrique, y compris ceux des phrases préparées. */
function factNumbers(obj: unknown, out: number[]): void {
  if (typeof obj === "number") out.push(Math.abs(obj));
  else if (typeof obj === "string") out.push(...numbersIn(obj).map((n) => n.value));
  else if (Array.isArray(obj)) obj.forEach((v) => factNumbers(v, out));
  else if (obj && typeof obj === "object") Object.values(obj).forEach((v) => factNumbers(v, out));
}

/**
 * Une PART de population au-delà de 50 % (`pct_local` d'une partition : composition des
 * ménages, catégories socioprofessionnelles, statut d'occupation…). Pas un taux : un taux
 * d'activité de 70 % ne rend aucune catégorie « majoritaire ».
 */
function hasMajorityShare(obj: unknown): boolean {
  if (Array.isArray(obj)) return obj.some(hasMajorityShare);
  if (!obj || typeof obj !== "object") return false;
  return Object.entries(obj).some(([k, v]) => (k === "pct_local" && typeof v === "number" ? v > 50 : hasMajorityShare(v)));
}

/** Les durées qu'on peut tirer des années des faits (« 10 ans » pour 2016–2025). */
function spans(facts: unknown): number[] {
  const years = new Set<number>();
  const visit = (o: unknown) => {
    if (typeof o === "number" && isYear(o)) years.add(o);
    else if (typeof o === "string") numbersIn(o).forEach((n) => isYear(n.value) && years.add(n.value));
    else if (Array.isArray(o)) o.forEach(visit);
    else if (o && typeof o === "object") Object.values(o).forEach(visit);
  };
  visit(facts);
  const ys = [...years];
  return ys.flatMap((a) => ys.flatMap((b) => (a > b ? [a - b, a - b + 1] : [])));
}

/**
 * Une phrase qui contredit la position au seuil calculée par le code (qualité de l'air) : le
 * modèle écrivait « au-delà de la cible de 25 jours » pour 17 jours.
 */
function contradictsThreshold(sentence: string, facts: unknown): boolean {
  const polluants = (facts as { polluants?: { seuil_reference?: { position?: string } }[] } | null)?.polluants ?? [];
  const above = /(au-delà|au-dessus|dépass\w*|supérieure?s?|excède\w*)[^.]{0,40}(cible|valeur guide|seuil)/i;
  const below = /(sous|en dessous|inférieure?s?)[^.]{0,40}(cible|valeur guide|seuil)/i;
  return polluants.some(({ seuil_reference: s }) =>
    (s?.position === "sous" && above.test(sentence)) || (s?.position === "au-dessus" && below.test(sentence)),
  );
}

const isYear = (n: number) => Number.isInteger(n) && n >= 1950 && n <= 2035;

/** Pourquoi une phrase est retirée, ou `null` si elle passe. */
export function rejectReason(sentence: string, facts: unknown): string | null {
  const known: number[] = [];
  factNumbers(facts, known);
  known.push(...spans(facts));
  for (const { value, decimals } of numbersIn(sentence)) {
    if (isYear(value)) continue;
    const tol = 0.5 * 10 ** -decimals + 1e-9;
    if (!known.some((k) => Math.abs(k - value) <= tol)) return `nombre absent des faits : ${value}`;
  }
  // « Majoritaire » : la part citée dans la même phrase doit dépasser 50 % ; sans part citée,
  // il en faut une au-delà de 50 % dans les faits (« majoritaires (46 %) » passait sinon,
  // parce qu'une autre part de la rubrique dépassait 50 %).
  for (const part of sentence.split(/(?<=[.!?])\s+/)) {
    if (!MAJORITY.test(part)) continue;
    const shares = [...part.matchAll(/(\d+(?:,\d+)?)\s?%/g)].map((m) => Number(m[1].replace(",", ".")));
    if (shares.length > 0 ? shares.every((v) => v <= 50) : !hasMajorityShare(facts)) {
      return "« majorité » sans part au-delà de 50 %";
    }
  }
  if (contradictsThreshold(sentence, facts)) return "contredit la position au seuil";
  return null;
}

/** Les phrases qui passent la relecture ; les autres sont journalisées et retirées. */
export function validateInsights(insights: CardInsights, input: Record<string, unknown>): CardInsights {
  const kept: CardInsights = {};
  for (const [key, sentence] of Object.entries(insights) as [CardInsightKey, string][]) {
    if (typeof sentence !== "string") continue;
    const reason = rejectReason(sentence, input[key]);
    if (reason) {
      console.warn(`[card-insights] phrase « ${key} » retirée (${reason}) : ${sentence}`);
      continue;
    }
    kept[key] = sentence;
  }
  return kept;
}
