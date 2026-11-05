import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { FEATURES } from "@/lib/site-features";
import { METHODE_SECTIONS } from "@/components/commune/methode";

/**
 * Les notes de méthode des pages commune, réunies sur une page.
 *
 * Chaque card d'arrondissement y renvoie par l'ancre de son sujet (`SourceLine`), au lieu de
 * recopier la note sous elle sur 45 pages.
 */
export const metadata: Metadata = {
  title: "Méthode et sources des pages arrondissement",
  description:
    "D'où viennent les prix, loyers, chiffres de délinquance, de population et d'équipements des pages arrondissement de Paris, Lyon et Marseille, et comment ils sont calculés.",
  alternates: { canonical: "/commune/methode" },
};

export default function MethodePage() {
  if (!FEATURES.hasSEOPages) notFound();

  return (
    <main className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand">
            <Brand />
          </Link>
          <div className="landing-nav-links">
            <Link href="/">Accueil</Link>
            <Link href="/commune/paris">Paris</Link>
            <Link href="/commune/lyon">Lyon</Link>
            <Link href="/commune/marseille">Marseille</Link>
          </div>
        </div>
      </nav>

      <section className="commune-hero">
        <span className="landing-eyebrow">Pages arrondissement</span>
        <h1 className="commune-title">Méthode et sources</h1>
        <p className="commune-lead">
          D&apos;où viennent les chiffres des pages arrondissement, et ce qu&apos;ils mesurent
          exactement. Toutes les données sont publiques.
        </p>
      </section>

      <div className="page-shell methode-page">
        {METHODE_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="card">
            <h2>{section.titre}</h2>
            {section.paragraphes.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Brand variant="footer" />
        </div>
        <span>Données publiques</span>
        <div className="landing-footer-links">
          <Link href="/">Analyser une adresse</Link>
          {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
        </div>
      </footer>
    </main>
  );
}
