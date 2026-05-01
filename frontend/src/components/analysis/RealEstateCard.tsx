import type { RealEstateAnalysisDto } from "@/types/location-analysis";

interface Props {
  realEstate: RealEstateAnalysisDto;
  loading?: boolean;
  error?: boolean;
}

export function RealEstateCard({ realEstate, loading, error }: Props) {
  return (
    <section className="card">
      <h2>Immobilier</h2>
      {loading && <p><em>Chargement des prix DVF (Cerema)...</em></p>}
      {error && <p><em>Erreur lors de la récupération des prix Cerema.</em></p>}
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
