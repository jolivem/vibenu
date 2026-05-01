import type { ClimateAnalysisDto } from "@/types/location-analysis";

interface IndicatorRow {
  label: string;
  unit: string;
  format: (n: number) => string;
  color: string;
  commune: number;
  national: number;
}

function fmtTemp(n: number) {
  return `${n.toFixed(1).replace(".", ",")} °C`;
}
function fmtMm(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} mm`;
}
function fmtHours(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} h`;
}

function deltaLabel(delta: number, unit: string): string {
  const r = Math.round(delta * 10) / 10;
  if (r === 0) return "= France";
  const sign = r > 0 ? "+" : "−";
  return `${sign}${Math.abs(r).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${unit}`;
}

export function ClimateCard({ climate }: { climate: ClimateAnalysisDto }) {
  const rows: IndicatorRow[] = [
    {
      label: "Température moyenne",
      unit: "°C",
      format: fmtTemp,
      color: "#dc2626",
      commune: climate.temperatureC,
      national: climate.national.temperatureC,
    },
    {
      label: "Précipitations annuelles",
      unit: "mm",
      format: fmtMm,
      color: "#2563eb",
      commune: climate.precipitationMm,
      national: climate.national.precipitationMm,
    },
    {
      label: "Ensoleillement annuel",
      unit: "h",
      format: fmtHours,
      color: "#f59e0b",
      commune: climate.sunshineHours,
      national: climate.national.sunshineHours,
    },
  ];

  return (
    <section className="card climate-card">
      <h2>Climat (normales {climate.periodStart}–{climate.periodEnd})</h2>
      <p className="muted">Comparaison avec les moyennes France métropolitaine.</p>

      <ul className="elections-list">
        {rows.map((r) => {
          const max = Math.max(r.commune, r.national, 1);
          const wCommune = (r.commune / max) * 100;
          const wNational = (r.national / max) * 100;
          const delta = r.commune - r.national;
          return (
            <li key={r.label} className="elections-row">
              <div className="elections-row-head">
                <span className="elections-name">{r.label}</span>
                <span
                  className={
                    delta > 0
                      ? "elections-delta-pill elections-delta-up"
                      : delta < 0
                        ? "elections-delta-pill elections-delta-down"
                        : "elections-delta-pill"
                  }
                >
                  {deltaLabel(delta, r.unit)}
                </span>
              </div>

              <div className="elections-bar-row">
                <span className="elections-bar-label">Commune</span>
                <div className="elections-bar">
                  <div
                    className="elections-bar-fill"
                    style={{ width: `${wCommune}%`, background: r.color }}
                  />
                </div>
                <span className="elections-bar-pct climate-value">
                  {r.format(r.commune)}
                </span>
              </div>

              <div className="elections-bar-row">
                <span className="elections-bar-label">France</span>
                <div className="elections-bar">
                  <div
                    className="elections-bar-fill elections-bar-fill--national"
                    style={{ width: `${wNational}%`, background: r.color }}
                  />
                </div>
                <span className="elections-bar-pct climate-value elections-bar-pct--national">
                  {r.format(r.national)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="elections-footnote">
        Source : Open-Meteo (réanalyse ERA5) pour la commune · Météo-France pour la moyenne nationale.
      </p>
    </section>
  );
}
