/**
 * Pseudo-langue de contrôle : `NEXT_PUBLIC_I18N_PSEUDO=1` entoure de ⟦ ⟧ tout texte issu
 * d'un dictionnaire. À l'écran comme dans le PDF, ce qui s'affiche sans crochets est donc
 * resté en dur dans le code — c'est le seul moyen, sans tests, de voir ce qu'il reste à
 * extraire. Variable `NEXT_PUBLIC_*` : inlinée au build, il faut relancer `next dev`.
 */
export const PSEUDO_ENABLED = process.env.NEXT_PUBLIC_I18N_PSEUDO === "1";

function mark(value: unknown): unknown {
  if (typeof value === "string") return value.trim() ? `⟦${value}⟧` : value;
  if (Array.isArray(value)) return value.map(mark);
  if (typeof value === "function") {
    return (...args: unknown[]) => mark((value as (...a: unknown[]) => unknown)(...args));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, mark(v)]));
  }
  return value;
}

/** Rend le dictionnaire tel quel, ou sa version marquée quand la pseudo-langue est active. */
export function withPseudo<T>(messages: T): T {
  return PSEUDO_ENABLED ? (mark(messages) as T) : messages;
}
