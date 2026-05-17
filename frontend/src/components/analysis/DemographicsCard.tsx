import type { DemographicsAnalysisDto } from "@/types/location-analysis";
import type { AnalysisMode } from "@/server-shared/types/location-analysis.dto";
import { AgeChart } from "./AgeChart";
import { formatDensity, formatPct, formatPopulation, formatRevenu } from "./demographicsFormat";

interface Props {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
}

export function DemographicsCard({ demographics, mode }: Props) {
  const { communeStats, nationalStats, communeIrisCount } = demographics;
  const france = nationalStats;
  const isCommuneMode = mode === "commune";

  // En mode commune : pas d'IRIS pertinent, on affiche commune vs France uniquement.
  if (isCommuneMode) {
    const communeData = communeStats;
    return (
      <section className="card">
        <h2>Démographie</h2>
        <p className="demographics-iris">
          Commune : {demographics.nomCommune || demographics.codeIris}
        </p>

        <table className="demographics-table">
          <thead>
            <tr>
              <th scope="col">Indicateur</th>
              <th scope="col">{demographics.nomCommune || "Commune"}</th>
              {france && <th scope="col">France</th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Population</th>
              <td>{formatPopulation(communeData?.population ?? null)}</td>
              {france && <td>{formatPopulation(france.population)}</td>}
            </tr>
            <tr>
              <th scope="row">Revenu médian</th>
              <td>{formatRevenu(communeData?.revenuMedian ?? null)}</td>
              {france && <td>{formatRevenu(france.revenuMedian)}</td>}
            </tr>
            <tr>
              <th scope="row">Taux de pauvreté</th>
              <td>{formatPct(communeData?.tauxPauvrete ?? null)}</td>
              {france && <td>{formatPct(france.tauxPauvrete)}</td>}
            </tr>
          </tbody>
        </table>

        {communeData?.ageDistribution && (
          <div className="demographics-age">
            <h3>Répartition par âge</h3>
            <AgeChart
              iris={communeData.ageDistribution}
              france={france?.ageDistribution ?? null}
              showCommune={false}
              mainSeriesName={demographics.nomCommune || "Commune"}
            />
          </div>
        )}

        <p className="demographics-footnote">
          Moyennes pondérées par population, agrégées à partir des quartiers IRIS de la commune.
        </p>
      </section>
    );
  }

  // Mode adresse : IRIS principal + commune (si plusieurs IRIS) + France.
  const showCommune = communeIrisCount > 1 && communeStats !== null;
  const commune = showCommune ? communeStats : null;

  return (
    <section className="card">
      <h2>Démographie</h2>
      <p className="demographics-iris">
        Quartier : {demographics.nomIris || demographics.codeIris}
        {demographics.nomCommune && ` — ${demographics.nomCommune}`}
      </p>
      {!showCommune && demographics.nomCommune && (
        <p className="demographics-note">
          Quartier unique pour cette commune — les chiffres du quartier et de la commune sont identiques.
        </p>
      )}

      <table className="demographics-table">
        <thead>
          <tr>
            <th scope="col">Indicateur</th>
            <th scope="col">Quartier</th>
            {showCommune && <th scope="col">{demographics.nomCommune || "Commune"}</th>}
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
          <AgeChart
            iris={demographics.ageDistribution}
            commune={commune?.ageDistribution ?? null}
            france={france?.ageDistribution ?? null}
            showCommune={showCommune}
          />
        </div>
      )}

      <p className="demographics-footnote">
        Commune et France : moyennes pondérées par population calculées à partir des quartiers (chiffres indicatifs).
      </p>
    </section>
  );
}
