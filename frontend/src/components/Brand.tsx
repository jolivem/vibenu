import { BRANDING } from "@/lib/site-features";

/**
 * Logo textuel splitté du site, paramétré par la variante (PUBLIC/PRO).
 *
 * Deux styles :
 * - `nav`    (défaut) : 2e moitié dans <span> → rendu typique nav (couleur d'accent)
 * - `footer`          : 2e moitié dans <i>    → rendu typique footer (italique serif)
 *
 * Le rendu visuel exact dépend de la classe CSS du parent (`landing-brand`,
 * `landing-footer-brand`, `analysis-brand`, etc.) — ce composant ne fait que
 * fournir le découpage texte.
 */
export function Brand({ variant = "nav" }: { variant?: "nav" | "footer" }) {
  if (variant === "footer") {
    return (
      <>
        {BRANDING.brandFirst}<i>{BRANDING.brandSecond}</i>
      </>
    );
  }
  return (
    <>
      {BRANDING.brandFirst}<span>{BRANDING.brandSecond}</span>
    </>
  );
}
