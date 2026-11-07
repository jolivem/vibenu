"use client";

import type { MouseEvent } from "react";
import { SECTION_NAV_ID } from "./SectionNav";

/**
 * Retour au sommaire par script : le saut d'ancre natif descendait la page au lieu de la
 * remonter sur mobile, où le sommaire est replacé en tête par `order` dans un parent en
 * `display: contents`. Le lien garde son `href` pour un navigateur sans JavaScript, et
 * l'adresse de la page ne reçoit pas `#sommaire`.
 */
function scrollToSummary(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById(SECTION_NAV_ID);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ block: "start" });
}

/**
 * « ↑ Sommaire » en face d'un titre de section, visible sur mobile seulement (CSS) : le
 * sommaire n'y reste pas à l'écran. Les libellés arrivent en props, pour servir aussi aux
 * pages `/commune/*`, rendues côté serveur avec la tranche française.
 */
export function SectionTopLink({ label, ariaLabel }: { label: string; ariaLabel: string }) {
  return (
    <a href={`#${SECTION_NAV_ID}`} className="page-section-top" aria-label={ariaLabel} onClick={scrollToSummary}>
      {label}
    </a>
  );
}
