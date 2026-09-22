import type { ClimateAnalysisDto } from "@/types/location-analysis";
import { ClimateCharts } from "@/components/analysis/ClimateCard";
import { climateStationLines } from "@/components/analysis/climateFormat";

/**
 * Le climat de la ville — les graphes de la card d'analyse, à l'échelle où ils sont
 * uniques.
 *
 * C'est précisément la raison pour laquelle cette rubrique n'est pas sur les pages
 * d'arrondissement : le fournisseur retient la station la plus proche dans un rayon de
 * 30 km, si bien que les vingt arrondissements parisiens porteraient les mêmes trente-six
 * valeurs mensuelles.
 */
export function CityHubClimateCard({
  climate,
  nomAffiche,
}: {
  climate: ClimateAnalysisDto;
  nomAffiche: string;
}) {
  const monthly = climate.monthly;
  if (!monthly) return null;

  // Le fournisseur nomme la série locale « Cette adresse », son seul appelant ayant
  // longtemps été l'analyse d'un logement. Sur une page de ville, le nom de la ville est
  // le libellé juste — et le réécrire ici évite de faire traverser un libellé d'affichage
  // à trois couches serveur.
  const named = { ...monthly, local: { ...monthly.local, name: nomAffiche } };
  const stationLines = climateStationLines(climate);

  return (
    <section className="card climate-card">
      <h2>
        Climat de {nomAffiche} : températures, pluie et ensoleillement
      </h2>

      <ClimateCharts monthly={named} />

      <p className="elections-footnote">
        Profil mois par mois sur les normales 1991-2020, comparé à trois climats de
        référence : continental, méditerranéen et océanique.
      </p>
      {stationLines.length > 0 && (
        <p className="elections-footnote">
          Stations Météo-France les plus proches du centre de {nomAffiche} —{" "}
          {stationLines.join(" · ")}.
        </p>
      )}
      <p className="elections-footnote">
        Source : Météo-France · Normales 1991-2020 par station (licence Etalab 2.0).
      </p>
    </section>
  );
}
