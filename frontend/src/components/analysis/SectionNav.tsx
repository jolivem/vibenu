"use client";

import { useEffect, useState } from "react";

/** Une entrée du sommaire : l'ancre et son libellé. */
export interface NavSection {
  /** L'`id` de la `<section>` visée — l'ancre `#id`. */
  id: string;
  title: string;
}

/**
 * Sommaire collant, en regard du corps de la page.
 *
 * Pas d'onglets ni d'accordéons : toutes les sections restent dans le DOM. C'est ce qui
 * préserve le Ctrl+F, le SEO si la page passe un jour en SSR, et la cohérence avec le PDF
 * qui reprend déjà toutes les sections.
 *
 * Le composant reçoit `{id, title}` plutôt qu'un identifiant à résoudre dans une table de
 * titres : l'écran d'analyse et les pages commune ont chacun leur taxonomie, et c'est la
 * seule chose qui les sépare ici. L'`IntersectionObserver` ci-dessous, lui, n'a aucune
 * raison d'exister en deux exemplaires.
 *
 * `topOffset` compense une barre fixe en haut de page : l'écran d'analyse en a une, les
 * pages commune non.
 */
export function SectionNav({
  sections,
  topOffset = 96,
}: {
  sections: NavSection[];
  topOffset?: number;
}) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

  // `sections` est reconstruit à chaque rendu du parent : on dépend de son contenu et non
  // de son identité, sinon l'observateur serait recréé en boucle.
  const key = sections.map((section) => section.id).join(",");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // La section active est la plus haute de celles à l'écran. La marge basse de -55 %
        // évite qu'une section à peine entrée par le bas ne vole la sélection.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: `-${topOffset}px 0px -55% 0px` },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, topOffset]);

  return (
    <nav className="section-nav" aria-label="Sommaire">
      <p className="section-nav-title">Sommaire</p>
      <ol>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={section.id === active ? "is-active" : undefined}
              aria-current={section.id === active ? "true" : undefined}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
