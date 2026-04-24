import type { NarrativeDto } from "@/types/location-analysis";

interface Props {
  narrative: NarrativeDto | null;
  isLoading: boolean;
  error: string | null;
}

export function NarrativeCard({ narrative, isLoading, error }: Props) {
  if (!narrative && !isLoading) return null;
  if (error) return null;

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
      {narrative && <p className="narrative-text">{narrative.paragraph}</p>}
    </section>
  );
}
