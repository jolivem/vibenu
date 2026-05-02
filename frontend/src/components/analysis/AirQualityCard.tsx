import type { AirQualityAnalysisDto, AirQualityLevel } from "@/types/location-analysis";

const LEVEL_ORDER: AirQualityLevel[] = ["bon", "moyen", "dégradé", "mauvais", "très_mauvais"];

const LEVEL_CONFIG: Record<
  AirQualityLevel,
  { label: string; className: string; color: string }
> = {
  bon: { label: "Bon", className: "air-badge air-badge--bon", color: "#16a34a" },
  moyen: { label: "Moyen", className: "air-badge air-badge--moyen", color: "#eab308" },
  dégradé: { label: "Dégradé", className: "air-badge air-badge--degrade", color: "#f97316" },
  mauvais: { label: "Mauvais", className: "air-badge air-badge--mauvais", color: "#dc2626" },
  très_mauvais: { label: "Très mauvais", className: "air-badge air-badge--tres-mauvais", color: "#7c1d6f" },
};

const WEEKDAY_FR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

function shortDay(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAY_FR[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
}

/** Niveau dominant sur une période. Si égalité, retourne le pire (logique précautionneuse). */
function modalLevel(days: AirQualityAnalysisDto["recentDays"]): AirQualityLevel | null {
  if (days.length === 0) return null;
  const counts = new Map<AirQualityLevel, number>();
  for (const d of days) counts.set(d.level, (counts.get(d.level) ?? 0) + 1);
  const max = Math.max(...counts.values());
  // Parmi les niveaux à fréquence max, prendre le pire (= ordre le plus élevé)
  const candidates = LEVEL_ORDER.filter((l) => counts.get(l) === max);
  return candidates[candidates.length - 1];
}

export function AirQualityCard({ airQuality }: { airQuality: AirQualityAnalysisDto }) {
  const config = LEVEL_CONFIG[airQuality.level];
  const past = airQuality.recentDays;
  const avgLevel = modalLevel(past);

  return (
    <section className="card air-card">
      <h2>Qualité de l&apos;air</h2>

      <div className="air-headline">
        <span className="air-headline-label">Aujourd&apos;hui</span>
        <span className={config.className}>{config.label}</span>
      </div>

      {/* Échelle visuelle 5 niveaux — sert aussi de légende pour l'historique */}
      <div className="air-scale">
        {LEVEL_ORDER.map((lvl) => {
          const cfg = LEVEL_CONFIG[lvl];
          const active = lvl === airQuality.level;
          return (
            <div
              key={lvl}
              className={`air-scale-step${active ? " air-scale-step--active" : ""}`}
              style={{ background: cfg.color }}
              title={cfg.label}
            >
              <span className="air-scale-step-label">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      <p className="muted">{airQuality.message}</p>

      {airQuality.dominantPollutant && (
        <p className="air-pollutant">
          Polluant principal : <strong>{airQuality.dominantPollutant}</strong>
        </p>
      )}

      {past.length >= 2 && (
        <div className="air-history">
          <p className="air-history-title">
            Sur les {past.length} derniers jours
            {avgLevel && (
              <>
                {" "}— en moyenne{" "}
                <span className={LEVEL_CONFIG[avgLevel].className}>
                  {LEVEL_CONFIG[avgLevel].label}
                </span>
              </>
            )}
          </p>
          <div className="air-history-strip">
            {past.map((d) => (
              <div key={d.date} className="air-history-day" title={`${d.date} : ${LEVEL_CONFIG[d.level].label}`}>
                <div
                  className="air-history-dot"
                  style={{ background: LEVEL_CONFIG[d.level].color }}
                />
                <span className="air-history-date">{shortDay(d.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {airQuality.debugRaw !== undefined && (
        <details className="narrative-debug">
          <summary>Données reçues d&apos;Atmo (debug)</summary>
          <pre>{JSON.stringify(airQuality.debugRaw, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
