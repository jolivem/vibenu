"use client";

import { useEffect, useState } from "react";
import { SECTION_TITLES, type SectionId } from "./sections";

/**
 * Sommaire collant, en regard du corps de la page.
 *
 * Pas d'onglets ni d'accordéons : les 6 sections restent toutes dans le DOM. C'est ce qui
 * préserve le Ctrl+F, le SEO si la page passe un jour en SSR, et la cohérence avec le PDF
 * qui reprend déjà toutes les sections.
 */
export function SectionNav({ sections }: { sections: SectionId[] }) {
  const [active, setActive] = useState<SectionId | null>(sections[0] ?? null);

  // `sections` est reconstruit à chaque rendu du parent : on dépend de son contenu et non
  // de son identité, sinon l'observateur serait recréé en boucle.
  const key = sections.join(",");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const elements = sections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // La section active est la plus haute de celles à l'écran. La marge basse de -55 %
        // évite qu'une section à peine entrée par le bas ne vole la sélection.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id as SectionId);
      },
      { rootMargin: "-96px 0px -55% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <nav className="section-nav" aria-label="Sommaire">
      <p className="section-nav-title">Sommaire</p>
      <ol>
        {sections.map((id) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={id === active ? "is-active" : undefined}
              aria-current={id === active ? "true" : undefined}
            >
              {SECTION_TITLES[id]}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
