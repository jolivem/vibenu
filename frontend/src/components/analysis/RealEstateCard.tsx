import type { ReactNode } from "react";
import type { RealEstateAnalysisDto } from "@/types/location-analysis";

interface Props {
  realEstate: RealEstateAnalysisDto;
  /** Carte thématique, rendue en fin de card et débordant jusqu'à ses bords. */
  children?: ReactNode;
}

export function RealEstateCard({ realEstate, children }: Props) {
  return (
    <section className="card">
      <h2>Immobilier</h2>
      <p>Transactions proches : {realEstate.nearbyTransactionsCount ?? "n/a"}</p>
      <p>Niveau de prix : {realEstate.priceLevel ?? "n/a"}</p>
      <p>Confiance : {realEstate.confidence ?? "n/a"}</p>
      {realEstate.medianPricePerSquareMeter && <p>Médiane : {realEstate.medianPricePerSquareMeter} €/m²</p>}
      {children ? (
        <div className="card-map">
          <p className="card-map-hint">
            Cliquez sur une surface colorée pour afficher le détail de la vente. Zoomez ou
            dézoomez pour les faire apparaître si nécessaire.
          </p>
          {children}
        </div>
      ) : null}
    </section>
  );
}
