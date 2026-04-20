import type { AggregateStatsDto, DemographicsAnalysisDto } from "@/types/location-analysis";

export function DemographicsCard({ demographics }: { demographics: DemographicsAnalysisDto }) {
  const { communeStats, nationalStats, communeIrisCount } = demographics;
  const showCommune = communeIrisCount > 1 && communeStats !== null;
  const commune = showCommune ? communeStats : null;
  const france = nationalStats;

  return (
    <section className="card">
      <h2>Démographie</h2>
      <p className="demographics-iris">
        IRIS : {demographics.nomIris || demographics.codeIris}
        {demographics.nomCommune && ` — ${demographics.nomCommune}`}
      </p>
      {!showCommune && demographics.nomCommune && (
        <p className="demographics-note">
          IRIS unique pour cette commune — les chiffres IRIS et communaux sont identiques.
        </p>
      )}

      <table className="demographics-table">
        <thead>
          <tr>
            <th scope="col">Indicateur</th>
            <th scope="col">IRIS</th>
            {showCommune && <th scope="col">Commune</th>}
            {france && <th scope="col">France</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Population</th>
            <td>{formatPopulation(demographics.population)}</td>
            {showCommune && <td>{formatPopulation(commune?.population ?? null)}</td>}
            {france && <td>{formatPopulation(france.population)}</td>}
          </tr>
          <tr>
            <th scope="row">Densité</th>
            <td>{formatDensity(demographics.density)}</td>
            {showCommune && <td>—</td>}
            {france && <td>—</td>}
          </tr>
          <tr>
            <th scope="row">Revenu médian</th>
            <td>{formatRevenu(demographics.revenuMedian)}</td>
            {showCommune && <td>{formatRevenu(commune?.revenuMedian ?? null)}</td>}
            {france && <td>{formatRevenu(france.revenuMedian)}</td>}
          </tr>
          <tr>
            <th scope="row">Taux de pauvreté</th>
            <td>{formatPct(demographics.tauxPauvrete)}</td>
            {showCommune && <td>{formatPct(commune?.tauxPauvrete ?? null)}</td>}
            {france && <td>{formatPct(france.tauxPauvrete)}</td>}
          </tr>
        </tbody>
      </table>

      {demographics.ageDistribution && (
        <div className="demographics-age">
          <h3>Répartition par âge</h3>
          <table className="demographics-table">
            <thead>
              <tr>
                <th scope="col">Tranche</th>
                <th scope="col">IRIS</th>
                {showCommune && <th scope="col">Commune</th>}
                {france && <th scope="col">France</th>}
              </tr>
            </thead>
            <tbody>
              <AgeRow
                label="0-14"
                iris={demographics.ageDistribution.pct0_14}
                commune={showCommune ? commune?.ageDistribution?.pct0_14 : undefined}
                france={france?.ageDistribution?.pct0_14}
                showCommune={showCommune}
                showFrance={france !== null}
              />
              <AgeRow
                label="15-29"
                iris={demographics.ageDistribution.pct15_29}
                commune={showCommune ? commune?.ageDistribution?.pct15_29 : undefined}
                france={france?.ageDistribution?.pct15_29}
                showCommune={showCommune}
                showFrance={france !== null}
              />
              <AgeRow
                label="30-44"
                iris={demographics.ageDistribution.pct30_44}
                commune={showCommune ? commune?.ageDistribution?.pct30_44 : undefined}
                france={france?.ageDistribution?.pct30_44}
                showCommune={showCommune}
                showFrance={france !== null}
              />
              <AgeRow
                label="45-59"
                iris={demographics.ageDistribution.pct45_59}
                commune={showCommune ? commune?.ageDistribution?.pct45_59 : undefined}
                france={france?.ageDistribution?.pct45_59}
                showCommune={showCommune}
                showFrance={france !== null}
              />
              <AgeRow
                label="60-74"
                iris={demographics.ageDistribution.pct60_74}
                commune={showCommune ? commune?.ageDistribution?.pct60_74 : undefined}
                france={france?.ageDistribution?.pct60_74}
                showCommune={showCommune}
                showFrance={france !== null}
              />
              <AgeRow
                label="75+"
                iris={demographics.ageDistribution.pct75Plus}
                commune={showCommune ? commune?.ageDistribution?.pct75Plus : undefined}
                france={france?.ageDistribution?.pct75Plus}
                showCommune={showCommune}
                showFrance={france !== null}
              />
            </tbody>
          </table>
        </div>
      )}

      <p className="demographics-footnote">
        Commune et France : moyennes pondérées par population calculées à partir des IRIS (chiffres indicatifs).
      </p>
    </section>
  );
}

function AgeRow({
  label,
  iris,
  commune,
  france,
  showCommune,
  showFrance,
}: {
  label: string;
  iris: number;
  commune: number | undefined;
  france: number | undefined;
  showCommune: boolean;
  showFrance: boolean;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        <AgeCell pct={iris} />
      </td>
      {showCommune && <td>{commune !== undefined ? <AgeCell pct={commune} /> : "—"}</td>}
      {showFrance && <td>{france !== undefined ? <AgeCell pct={france} /> : "—"}</td>}
    </tr>
  );
}

function AgeCell({ pct }: { pct: number }) {
  return (
    <div className="age-bar-row">
      <div className="age-bar-track">
        <div className="age-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="age-bar-value">{pct}%</span>
    </div>
  );
}

function formatPopulation(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} hab.`;
}

function formatDensity(value: number | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString("fr-FR")} hab./km²`;
}

function formatRevenu(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} €/an`;
}

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)} %`;
}
