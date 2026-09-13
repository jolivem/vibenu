import type { AirQualityAnalysisDto } from "@/types/location-analysis";
import { LEVEL_CONFIG, LEVEL_ORDER, modalLevel, shortDay } from "./airQualityModel";

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
