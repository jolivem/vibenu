import type { NarrativeDto } from "@/types/location-analysis";

interface Props {
  narrative: NarrativeDto | null;
  isLoading: boolean;
  error: string | null;
}

/** Coupe un paragraphe en phrases (sépare après `. `, `! `, `? ` mais pas après abréviations courantes). */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function NarrativeCard({ narrative, isLoading, error }: Props) {
  if (!narrative && !isLoading) return null;
  if (error) return null;

  const sentences = narrative ? splitSentences(narrative.paragraph) : [];

  return (
    <section className="card narrative-card">
      <h2>Synthèse</h2>
      {isLoading && !narrative && (
        <div className="narrative-skeleton" aria-hidden>
          <span />
          <span />
          <span className="narrative-skeleton--short" />
        </div>
      )}
      {narrative && (
        <div className="narrative-text">
          {sentences.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
      )}
      {narrative?.debugInput !== undefined && (
        <details className="narrative-debug">
          <summary>Données envoyées à Mistral (debug)</summary>
          <pre>{JSON.stringify(narrative.debugInput, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
