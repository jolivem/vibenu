import Link from "next/link";
import type { Metadata } from "next";
import { CITIES, type City } from "@/lib/commune-slugs";
import { FEATURES, BRANDING } from "@/lib/site-features";
import { SITE_URL } from "@/lib/site-url";
import { createFormat } from "@/i18n/format";
import { comparison as m } from "@/i18n/messages/fr/analysis/comparison";
import { construireComparaison, valeursDe } from "@/lib/comparison/build";
import { extremes } from "@/lib/comparison/rank";
import { formatCellule, formatNombre } from "@/lib/comparison/format";
import type { Comparaison, IndicateurComparableId } from "@/lib/comparison/types";
import { Brand } from "@/components/Brand";
import { SectionNav } from "@/components/analysis/SectionNav";
import { SectionTopLink } from "@/components/analysis/SectionTopLink";
import { sections as sectionsFr } from "@/i18n/messages/fr/analysis/sections";
import { loadCityStats } from "./cityComparison";
import { COMMUNE_INDICATEURS, denominateurSecurite } from "./communeIndicators";
import {
  COMPARATIF_SECTION_ORDER,
  COMPARATIF_SECTION_TITLES,
  COMPARATIF_THEMES,
  comparatifPath,
  comparatifSectionContent,
  type ComparatifSectionId,
  type ComparatifThemeId,
} from "./comparatifSections";
import {
  anneeSecurite,
  chapeauComparatif,
  descriptionComparatif,
  faqComparatif,
  noteTaux,
  phraseTheme,
} from "./comparatifTextes";
import { ComparisonTable, type ComparisonTableRow } from "./ComparisonTable";
import { VerticalBars, type VerticalBarReference, type VerticalBarRow } from "./VerticalBars";
import { CommuneFaqSection } from "./CommuneFaqSection";
import { SourceLine } from "./SourceLine";
import { sujetsHub } from "./CommuneRelatedLinks";

const fmt = createFormat("fr");

/**
 * Tous les arrondissements de la ville, lus dans leurs `CommuneStats` (cache 24 h partagé avec
 * leurs pages et le hub). Les repères — ville et France — sont portés par chaque
 * arrondissement : on les lit sur le premier qui en a.
 */
async function loadComparaison(city: City): Promise<{
  comparaison: Comparaison;
  annee: number | null;
  /** Dénominateur publié d'un taux de délinquance, pour chaque arrondissement de `comparaison.lieux`. */
  denominateurs: (id: IndicateurComparableId) => Array<number | null>;
  /** La ville a-t-elle un indice de qualité de l'air sur son hub (Paris seulement) ? */
  avecAir: boolean;
}> {
  const arrondissements = await loadCityStats(city);
  const repere = arrondissements.find((a) => a.stats.securite?.ville) ?? arrondissements[0];
  const comparaison = construireComparaison(
    arrondissements.map((a) => ({
      lieu: { id: a.entry.slug, nom: a.entry.nomCourt, href: `/commune/${a.entry.slug}` },
      src: a.stats,
    })),
    Object.values(COMMUNE_INDICATEURS),
    repere
      ? [
          { id: "ville", kind: "ville", nom: `${CITIES[city].nomAffiche} (ensemble)`, src: repere.stats },
          { id: "france", kind: "france", nom: m.references.france, src: repere.stats },
        ]
      : [],
  );
  return {
    comparaison,
    annee: anneeSecurite(repere?.stats.securite?.local.annees),
    denominateurs: (id) => arrondissements.map((a) => denominateurSecurite(a.stats, id)),
    avecAir: FEATURES.showAirQuality && arrondissements.some((a) => a.stats.airQuality),
  };
}

export async function comparatifMetadata(city: City): Promise<Metadata> {
  const cityDef = CITIES[city];
  const title = `Arrondissements de ${cityDef.nomAffiche} comparés : prix, loyers, revenus, sécurité`;
  let description = `Les ${cityDef.nbArrondissements} arrondissements de ${cityDef.nomAffiche} comparés et classés : prix, loyers, revenus, logement, emploi et sécurité.`;
  try {
    const { comparaison } = await loadComparaison(city);
    description = descriptionComparatif(city, comparaison);
  } catch (error) {
    console.warn("Comparatif : méta-description par défaut", error);
  }
  return {
    title,
    description,
    alternates: { canonical: comparatifPath(city) },
    openGraph: {
      type: "article",
      locale: "fr_FR",
      url: `${SITE_URL}${comparatifPath(city)}`,
      title: `${title} · ${BRANDING.name}`,
      description,
    },
  };
}

/** Les colonnes d'un thème qui ont au moins une valeur : un loyer coupé par drapeau disparaît. */
function colonnesAffichees(c: Comparaison, theme: ComparatifThemeId): IndicateurComparableId[] {
  return COMPARATIF_THEMES[theme].colonnes.filter((id) =>
    (c.cellules[id] ?? []).some((cell) => cell.valeur !== null || cell.masque),
  );
}

const formatIndicateur = (id: IndicateurComparableId, valeur: number | null, masque = false) => {
  const ind = COMMUNE_INDICATEURS[id];
  return formatCellule({ valeur, masque }, ind.unite, ind.decimales, fmt, m);
};

/** Un graphe en colonnes : les arrondissements classés, les repères en lignes. Rien sous `MIN_CLASSES` valeurs. */
function Graphe({ c, id, note }: { c: Comparaison; id: IndicateurComparableId; note?: string | null }) {
  const valeurs = valeursDe(c, id);
  if (!extremes(valeurs)) return null;
  const ind = COMMUNE_INDICATEURS[id];
  const barres: VerticalBarRow[] = c.lieux.flatMap((l, i) => {
    const v = valeurs[i];
    if (v === null) return [];
    return [
      {
        id: l.id,
        // « Paris 6e » → « 6e » : le nom de la ville est dans le titre.
        court: l.nom.split(" ").pop() ?? l.nom,
        nom: l.nom,
        href: l.href,
        valeur: v,
        nombre: formatNombre(v, ind.decimales, fmt),
        texte: formatIndicateur(id, v),
      },
    ];
  });
  const reperes: VerticalBarReference[] = c.references.flatMap((ref) => {
    const v = ref.cellules[id];
    return v === null || v === undefined
      ? []
      : [{ id: ref.id, valeur: v, libelle: `${ref.nom} : ${formatIndicateur(id, v)}` }];
  });
  // Même gabarit que les graphes de l'analyse : titre et ligne d'unité à gauche, graphe et
  // légende dans la colonne centrée de `--line-chart-max`.
  return (
    <div className="comparison-metric">
      <h3>{m.titres[id]}</h3>
      <p className="metric-unit">{m.definitions[id]}</p>
      <VerticalBars rows={barres} references={reperes} label={m.definitions[id]} />
      {note && <p className="comparison-note">{note}</p>}
    </div>
  );
}

function ThemeBlock({
  c,
  theme,
  annee,
  denominateurs,
}: {
  c: Comparaison;
  theme: ComparatifThemeId;
  annee: number | null;
  denominateurs: (id: IndicateurComparableId) => Array<number | null>;
}) {
  const t = COMPARATIF_THEMES[theme];
  const colonnes = colonnesAffichees(c, theme);
  const format = formatIndicateur;

  const lignes: ComparisonTableRow[] = c.lieux.map((l, i) => ({
    id: l.id,
    nom: l.nom,
    href: l.href,
    cellules: colonnes.map((id) => {
      const cell = c.cellules[id]?.[i] ?? { valeur: null, masque: false };
      return {
        texte: format(id, cell.valeur, cell.masque),
        valeur: cell.valeur,
        titre: cell.masque ? m.masqueTitre : undefined,
      };
    }),
  }));
  const references = c.references
    .filter((r) => colonnes.some((id) => r.cellules[id] != null))
    .map((r) => ({ id: r.id, nom: r.nom, cellules: colonnes.map((id) => format(id, r.cellules[id] ?? null)) }));

  const phrase = phraseTheme(c, theme, annee);
  const source =
    theme === "securite"
      ? `${t.source}${annee ? ` en ${annee}` : ""} (‰ : pour 1 000 logements pour les cambriolages, pour 1 000 habitants sinon)`
      : t.source;

  return (
    <section className="card comparison-card">
      {phrase && <p className="commune-rank">{phrase}</p>}
      {t.graphes.map((id) => (
        <Graphe key={id} c={c} id={id} note={noteTaux(c, id, denominateurs(id))} />
      ))}
      {/* Replié par défaut : les graphes suffisent à la lecture, et le contenu d'un
          <details> fermé reste dans le HTML que les robots indexent. */}
      <details className="comparison-details">
        <summary>{m.tableau}</summary>
        <ComparisonTable
        caption={`${COMPARATIF_SECTION_TITLES[theme]} : tous les arrondissements`}
        enteteLieu="Arrondissement"
        ordreInitial={m.ordreInitial}
        colonnes={colonnes.map((id) => ({
          id,
          label: m.indicateurs[id],
          definition: m.definitions[id],
          trier: m.trier(m.indicateurs[id]),
        }))}
        lignes={lignes}
        references={references}
        />
      </details>
      <SourceLine anchor={t.methode}>{source}</SourceLine>
    </section>
  );
}

function ComparatifSection({ id, children }: { id: ComparatifSectionId; children: React.ReactNode }) {
  return (
    <section id={id} className="page-section">
      <div className="page-section-head">
        <h2 className="page-section-title">{COMPARATIF_SECTION_TITLES[id]}</h2>
        <SectionTopLink label={sectionsFr.backToSummary} ariaLabel={sectionsFr.backToSummaryLabel} />
      </div>
      <div className="page-section-body">{children}</div>
    </section>
  );
}

const THEMES = COMPARATIF_SECTION_ORDER.filter((id): id is ComparatifThemeId => id !== "faq");

export async function CityComparisonPage({ city }: { city: City }) {
  const cityDef = CITIES[city];
  const { comparaison, annee, denominateurs, avecAir } = await loadComparaison(city);
  const faqItems = faqComparatif(city, comparaison, annee);
  const content = comparatifSectionContent(comparaison, faqItems.length);
  const navSections = COMPARATIF_SECTION_ORDER.filter((id) => content[id]).map((id) => ({
    id,
    title: COMPARATIF_SECTION_TITLES[id],
  }));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: cityDef.nomAffiche, item: `${SITE_URL}/commune/${city}` },
      {
        "@type": "ListItem",
        position: 3,
        name: "Arrondissements comparés",
        item: `${SITE_URL}${comparatifPath(city)}`,
      },
    ],
  };

  return (
    <main className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand">
            <Brand />
          </Link>
          <div className="landing-nav-links">
            <Link href="/">Accueil</Link>
            <Link href={`/commune/${city}`}>{cityDef.nomAffiche}</Link>
            <Link href="/commune/methode">Méthode</Link>
          </div>
        </div>
      </nav>

      <section className="commune-hero">
        <span className="landing-eyebrow">
          <Link href={`/commune/${city}`}>{cityDef.nomAffiche}</Link>
        </span>
        <h1 className="commune-title">
          Les {comparaison.lieux.length} arrondissements de {cityDef.nomAffiche} comparés
        </h1>
        <p className="commune-lead">{chapeauComparatif(city, comparaison)}</p>
      </section>

      <div className="page-shell">
        <div className="page-body">
          <aside className="page-sidebar">
            <SectionNav sections={navSections} topOffset={0} />
          </aside>

          <div className="page-sections">
            {THEMES.filter((id) => content[id]).map((id) => (
              <ComparatifSection key={id} id={id}>
                <ThemeBlock c={comparaison} theme={id} annee={annee} denominateurs={denominateurs} />
              </ComparatifSection>
            ))}

            {content.faq && (
              <ComparatifSection id="faq">
                <CommuneFaqSection items={faqItems} />
              </ComparatifSection>
            )}
          </div>
        </div>

        {/* Même pied que les pages d'arrondissement (`commune-related`), centré : il n'y a
            pas ici de tableau des voisins pour l'aligner à gauche. */}
        <section className="commune-related">
          <div className="commune-cta-row commune-cta-row--center">
            <Link href={`/commune/${city}`} className="commune-cta-btn">
              {cityDef.nomAffiche} : {sujetsHub(avecAir)} →
            </Link>
            <Link href="/" className="commune-cta-btn">
              Analyser une adresse →
            </Link>
          </div>
          <p className="commune-cta-aside">
            <Link href="/commune/methode">Méthode et sources</Link>
          </p>
        </section>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Brand variant="footer" />
        </div>
        <span>Données publiques · DVF · ANIL · INSEE · SSMSI · ministère de l&apos;Intérieur</span>
        <div className="landing-footer-links">
          <Link href="/">Analyser une adresse</Link>
          {FEATURES.hasAboutPage && <Link href="/a-propos">À propos</Link>}
        </div>
      </footer>
    </main>
  );
}
