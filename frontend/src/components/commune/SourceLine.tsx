import Link from "next/link";
import type { ReactNode } from "react";
import type { MethodeAnchor } from "./methode";

/**
 * La source d'une card, en une ligne, et le lien vers sa méthode.
 *
 * Les notes de méthode (chômage déclaratif, secret statistique, rattachement BPE…) étaient
 * recopiées mot pour mot sur les 45 pages d'arrondissement : c'est le texte que Google
 * comptait comme doublon. Elles vivent désormais une seule fois, sur `/commune/methode`.
 */
export function SourceLine({ anchor, children }: { anchor: MethodeAnchor; children: ReactNode }) {
  return (
    <p className="elections-footnote">
      Source : {children} · <Link href={`/commune/methode#${anchor}`}>méthode</Link>
    </p>
  );
}
