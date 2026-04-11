import type { RealEstateAnalysisDto } from "@/types/location-analysis";

export function RealEstateCard({ realEstate }: { realEstate: RealEstateAnalysisDto }) {
  return (
    <section className="card">
      <h2>Immobilier</h2>
      <p>Score : {realEstate.score}/100</p>
      <p>Transactions proches : {realEstate.nearbyTransactionsCount ?? "n/a"}</p>
      <p>Niveau de prix : {realEstate.priceLevel ?? "n/a"}</p>
      <p>Confiance : {realEstate.confidence ?? "n/a"}</p>
      {realEstate.medianPricePerSquareMeter && <p>Médiane : {realEstate.medianPricePerSquareMeter} €/m²</p>}
    </section>
  );
}
