import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { CITIES } from "@/lib/commune-slugs";
import { formatEur, formatInt, formatPct } from "./format";

interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  stats: CommuneStats;
  nomCourt: string;
}

/**
 * FAQs auto-générées à partir des données réelles.
 * Toute question dont la réponse n'est pas chiffrable est exclue.
 */
function buildFaqItems(stats: CommuneStats, nomCourt: string): FaqItem[] {
  const items: FaqItem[] = [];

  if (stats.prix.prixM2Median) {
    items.push({
      question: `Quel est le prix moyen au m² à ${nomCourt} ?`,
      answer: `Le prix médian d'un appartement à ${nomCourt} est de ${formatEur(stats.prix.prixM2Median)} le mètre carré, calculé sur ${formatInt(stats.prix.nbTransactions)} transactions enregistrées au cours des 24 derniers mois (données DVF).`,
    });
  }

  if (stats.demo.populationTotale > 0) {
    items.push({
      question: `Combien d'habitants à ${nomCourt} ?`,
      answer: `${nomCourt} compte ${formatInt(stats.demo.populationTotale)} habitants selon les données INSEE IRIS agrégées.`,
    });
  }

  if (stats.demo.revenuMedianPondere) {
    items.push({
      question: `Quel est le revenu médian à ${nomCourt} ?`,
      answer: `Le revenu médian estimé à ${nomCourt} est de ${formatEur(stats.demo.revenuMedianPondere)} (moyenne pondérée des médianes IRIS, source INSEE Filosofi).`,
    });
  }

  if (stats.highlights.profilAgeDominant) {
    items.push({
      question: `${nomCourt} est-il un arrondissement familial ?`,
      answer: `La tranche d'âge dominante à ${nomCourt} est ${stats.highlights.profilAgeDominant} (${formatPct(stats.demo.partAges.part_30_44, 1)} de la population pour les 30-44 ans, ${formatPct(stats.demo.partAges.part_0_14, 1)} pour les 0-14 ans).`,
    });
  }

  if (stats.airQuality && stats.airQuality.historique.length > 0) {
    const cityDef = CITIES[stats.city];
    const latest = stats.airQuality.historique[0];
    const joursAcceptables = latest.joursBonne + latest.joursMoyenne;
    const joursDegradesOuPire =
      latest.joursDegradee +
      latest.joursMauvaise +
      latest.joursTresMauvaise +
      latest.joursExtremementMauvaise;
    items.push({
      question: `Quelle est la qualité de l'air à ${nomCourt} ?`,
      answer: `En ${latest.annee}, ${cityDef.nomAffiche} a enregistré ${joursAcceptables} jours de qualité de l'air bonne ou moyenne et ${joursDegradesOuPire} jours dégradés ou plus, selon l'indice ATMO de ${cityDef.airSourceLabel}. La même mesure couvre l'ensemble de la ville, ${nomCourt} compris.`,
    });
  }

  if (stats.elections) {
    const top = stats.elections.candidats.slice(0, 2);
    if (top.length > 0) {
      const parts = top
        .map((c) => `${c.candidat} (${c.pctExprimes.toFixed(1).replace(".", ",")} %)`)
        .join(", ");
      items.push({
        question: `Comment a voté ${nomCourt} à la présidentielle 2022 ?`,
        answer: `Au 1ᵉʳ tour de la présidentielle 2022 à ${nomCourt}, les deux candidats arrivés en tête sont ${parts}. Taux de participation : ${formatPct(stats.elections.tauxParticipation, 1)}. Source : Ministère de l'Intérieur.`,
      });
    }
  }

  if (stats.equipements.length > 0) {
    const top = stats.equipements
      .filter((e) => e.nb > 0)
      .sort((a, b) => b.densite1000hab - a.densite1000hab)
      .slice(0, 3);
    if (top.length > 0) {
      items.push({
        question: `Quels équipements à proximité dans ${nomCourt} ?`,
        answer: `Les domaines les plus représentés à ${nomCourt} sont : ${top.map((t) => `${t.label.toLowerCase()} (${formatInt(t.nb)} équipements)`).join(", ")}.`,
      });
    }
  }

  return items;
}

export function CommuneFaqSection({ stats, nomCourt }: Props) {
  const items = buildFaqItems(stats, nomCourt);
  if (items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className="commune-section" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="commune-section-head">
        <h2 className="commune-section-title">
          Questions <i>fréquentes</i>
        </h2>
        <span className="section-meta">{items.length} questions</span>
      </div>
      <div className="faq-list">
        {items.map((item) => (
          <details key={item.question} className="faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
