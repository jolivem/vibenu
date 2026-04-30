import type { AirQualityAnalysisDto } from "@/types/location-analysis";

const LEVEL_CONFIG: Record<
  AirQualityAnalysisDto["level"],
  { label: string; className: string }
> = {
  bon: { label: "Bon", className: "air-badge air-badge--bon" },
  moyen: { label: "Moyen", className: "air-badge air-badge--moyen" },
  dégradé: { label: "Dégradé", className: "air-badge air-badge--degrade" },
  mauvais: { label: "Mauvais", className: "air-badge air-badge--mauvais" },
  très_mauvais: { label: "Très mauvais", className: "air-badge air-badge--tres-mauvais" },
};

export function AirQualityCard({ airQuality }: { airQuality: AirQualityAnalysisDto }) {
  const config = LEVEL_CONFIG[airQuality.level];

  return (
    <section className="card">
      <h2>Qualité de l'air</h2>
      <p>
        Niveau : <span className={config.className}>{config.label}</span>
      </p>
      <p className="muted">{airQuality.message}</p>
      {airQuality.debugRaw !== undefined && (
        <details className="narrative-debug">
          <summary>Données reçues d&apos;Atmo (debug)</summary>
          <pre>{JSON.stringify(airQuality.debugRaw, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
