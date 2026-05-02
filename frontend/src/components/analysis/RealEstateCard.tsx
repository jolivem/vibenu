import type { RealEstateAnalysisDto } from "@/types/location-analysis";

interface Props {
  realEstate: RealEstateAnalysisDto;
}

export function RealEstateCard({ realEstate }: Props) {
  return (
    <section className="card">
      <h2>Immobilier</h2>
      <p>Transactions proches : {realEstate.nearbyTransactionsCount ?? "n/a"}</p>
      <p>Niveau de prix : {realEstate.priceLevel ?? "n/a"}</p>
      <p>Confiance : {realEstate.confidence ?? "n/a"}</p>
      {realEstate.medianPricePerSquareMeter && <p>Médiane : {realEstate.medianPricePerSquareMeter} €/m²</p>}
      {(realEstate.transactionFeatures?.length ?? 0) > 0 && (
        <p className="muted realestate-hint">
          💡 Cochez « Prix immobiliers » dans le panneau de la carte pour visualiser les transactions.
        </p>
      )}
    </section>
  );
}
