import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { formatDecimal } from "./format";

interface Props {
  stats: CommuneStats;
}

export function CommuneAirQualitySection({ stats }: Props) {
  if (!stats.airQuality || stats.airQuality.polluants.length === 0) {
    return (
      <section className="commune-section commune-section--alt" id="qualite-air">
        <div className="commune-section-head">
          <span className="section-num">04</span>
          <h2 className="commune-section-title">
            Qualité de <i>l&apos;air</i>
          </h2>
        </div>
        <p className="commune-empty">
          Données de qualité de l&apos;air en cours d&apos;ingestion pour cet arrondissement.
        </p>
      </section>
    );
  }

  const { annee, polluants } = stats.airQuality;

  return (
    <section className="commune-section commune-section--alt" id="qualite-air">
      <div className="commune-section-head">
        <span className="section-num">04</span>
        <h2 className="commune-section-title">
          Qualité de <i>l&apos;air</i>
        </h2>
        <span className="section-meta">AirParif · {annee} · seuils OMS 2021</span>
      </div>

      <table className="commune-air-table" aria-label="Concentrations annuelles">
        <thead>
          <tr>
            <th scope="col">Polluant</th>
            <th scope="col">Concentration</th>
            <th scope="col">Seuil OMS</th>
            <th scope="col">Écart</th>
          </tr>
        </thead>
        <tbody>
          {polluants.map((p) => {
            const aboveOms = p.ratioOms !== null && p.ratioOms > 1;
            return (
              <tr key={p.code}>
                <th scope="row">{p.label}</th>
                <td>
                  <strong>{formatDecimal(p.concentration)}</strong> µg/m³
                </td>
                <td>{p.seuilOms !== null ? `${formatDecimal(p.seuilOms)} µg/m³` : "—"}</td>
                <td>
                  {p.ratioOms !== null ? (
                    <span className={`commune-air-ratio ${aboveOms ? "is-warn" : "is-ok"}`}>
                      ×{p.ratioOms.toFixed(1).replace(".", ",")}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="commune-air-note">
        L&apos;OMS a abaissé en 2021 ses seuils annuels de qualité de l&apos;air. La plupart des
        zones urbaines en France les dépassent encore.
      </p>
    </section>
  );
}
