import type { AirQualityAnalysisDto, AirQualityLevel } from "@/types/location-analysis";

const LEVEL_ORDER: AirQualityLevel[] = ["bon", "moyen", "dégradé", "mauvais", "très_mauvais"];

/** Exporté pour le bandeau de chiffres clés : le DTO porte `très_mauvais` avec un
 *  underscore, qu'on ne peut pas afficher tel quel. */
export const LEVEL_CONFIG: Record<
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
  const past = airQuality.recentDays;
  const avgLevel = modalLevel(past);

  return (
    <section className="card air-card">
      <h2>Qualité de l&apos;air</h2>

      {/* Échelle visuelle 5 niveaux — sert de légende pour l'historique */}
      <div className="air-scale">
        {LEVEL_ORDER.map((lvl) => {
          const cfg = LEVEL_CONFIG[lvl];
          return (
            <div
              key={lvl}
              className="air-scale-step"
              style={{ background: cfg.color }}
              title={cfg.label}
            >
              <span className="air-scale-step-label">{cfg.label}</span>
            </div>
          );
        })}
      </div>

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

      {airQuality.monthly && airQuality.monthly.daysCovered > 0 && (
        <div className="air-monthly">
          <p className="air-monthly-title">
            Sur les {airQuality.monthly.daysCovered} derniers jours — qualité moyenne{" "}
            <span className={LEVEL_CONFIG[airQuality.monthly.level].className}>
              {LEVEL_CONFIG[airQuality.monthly.level].label}
            </span>
          </p>
          {airQuality.monthly.pollutants.length > 0 && (
            <ul className="air-monthly-pollutants">
              {airQuality.monthly.pollutants.map((p) => (
                <li key={p.code}>
                  <span
                    className="air-monthly-dot"
                    style={{ background: LEVEL_CONFIG[p.level].color }}
                  />
                  {p.label}{" "}
                  <span className="poi-distance">— {LEVEL_CONFIG[p.level].label}</span>
                </li>
              ))}
            </ul>
          )}
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
