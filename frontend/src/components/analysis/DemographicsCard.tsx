import type { DemographicsAnalysisDto } from "@/types/location-analysis";

export function DemographicsCard({ demographics }: { demographics: DemographicsAnalysisDto }) {
  const age = demographics.ageDistribution;

  return (
    <section className="card">
      <h2>Démographie</h2>
      <p className="demographics-iris">
        IRIS : {demographics.nomIris || demographics.codeIris}
        {demographics.nomCommune && ` — ${demographics.nomCommune}`}
      </p>

      {demographics.population != null && (
        <p>Population : {demographics.population.toLocaleString("fr-FR")} hab.</p>
      )}

      {demographics.density != null && (
        <p>Densité : {demographics.density.toLocaleString("fr-FR")} hab./km²</p>
      )}

      {demographics.revenuMedian != null && (
        <p>Revenu médian : {Math.round(demographics.revenuMedian).toLocaleString("fr-FR")} €/an</p>
      )}

      {demographics.tauxPauvrete != null && (
        <p>Taux de pauvreté : {demographics.tauxPauvrete.toFixed(1)} %</p>
      )}

      {age && (
        <div className="demographics-age">
          <h3>Répartition par âge</h3>
          <div className="age-bars">
            <AgeBar label="0-14" pct={age.pct0_14} />
            <AgeBar label="15-29" pct={age.pct15_29} />
            <AgeBar label="30-44" pct={age.pct30_44} />
            <AgeBar label="45-59" pct={age.pct45_59} />
            <AgeBar label="60-74" pct={age.pct60_74} />
            <AgeBar label="75+" pct={age.pct75Plus} />
          </div>
        </div>
      )}
    </section>
  );
}

function AgeBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="age-bar-row">
      <span className="age-bar-label">{label}</span>
      <div className="age-bar-track">
        <div className="age-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="age-bar-value">{pct}%</span>
    </div>
  );
}
