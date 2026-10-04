import type { AirQualityAnalysisDto } from "@/types/location-analysis";
import type { AirMessages } from "@/i18n/messages/fr/analysis/air";
import { LEVEL_CONFIG, LEVEL_ORDER, modalLevel } from "./airQualityModel";

export function AirQualityCard({ airQuality, m }: { airQuality: AirQualityAnalysisDto; m: AirMessages }) {
  const past = airQuality.recentDays;
  const avgLevel = modalLevel(past);

  return (
    <section className="card air-card">
      <h2>{m.title}</h2>

      {/* Échelle visuelle 5 niveaux — sert de légende pour l'historique */}
      <div className="air-scale">
        {LEVEL_ORDER.map((lvl) => {
          const cfg = LEVEL_CONFIG[lvl];
          return (
            <div
              key={lvl}
              className="air-scale-step"
              style={{ background: cfg.color }}
              title={m.levels[lvl]}
            >
              <span className="air-scale-step-label">{m.levels[lvl]}</span>
            </div>
          );
        })}
      </div>

      {past.length >= 2 && (
        <div className="air-history">
          <p className="air-history-title">
            {m.recentDays(past.length)}
            {avgLevel && (
              <>
                {m.averageLead}
                <span className={LEVEL_CONFIG[avgLevel].className}>{m.levels[avgLevel]}</span>
              </>
            )}
          </p>
          <div className="air-history-strip">
            {past.map((d) => (
              <div key={d.date} className="air-history-day" title={m.dayTitle(d.date, d.level)}>
                <div
                  className="air-history-dot"
                  style={{ background: LEVEL_CONFIG[d.level].color }}
                />
                <span className="air-history-date">{m.shortDay(d.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {airQuality.monthly && airQuality.monthly.daysCovered > 0 && (
        <div className="air-monthly">
          <p className="air-monthly-title">
            {m.monthlyLead(airQuality.monthly.daysCovered)}
            <span className={LEVEL_CONFIG[airQuality.monthly.level].className}>
              {m.levels[airQuality.monthly.level]}
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
                  {m.pollutants[p.code] ?? p.label}{" "}
                  <span className="poi-distance">{m.pollutantLevel(p.level)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {airQuality.debugRaw !== undefined && (
        <details className="narrative-debug">
          <summary>{m.debugSummary}</summary>
          <pre>{JSON.stringify(airQuality.debugRaw, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
