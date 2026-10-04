import type { ReactNode } from "react";
import type { RealEstateMessages } from "@/i18n/messages/fr/analysis/realEstate";
import type { RealEstateAnalysisDto } from "@/types/location-analysis";

interface Props {
  realEstate: RealEstateAnalysisDto;
  m: RealEstateMessages;
  /** Carte thématique, rendue en fin de card et débordant jusqu'à ses bords. */
  children?: ReactNode;
}

export function RealEstateCard({ realEstate, m, children }: Props) {
  return (
    <section className="card">
      <h2>{m.title}</h2>
      {realEstate.medianPricePerSquareMeter && <p>{m.median(realEstate.medianPricePerSquareMeter)}</p>}
      <p>{m.transactions(realEstate.nearbyTransactionsCount)}</p>
      {children ? (
        <div className="card-map">
          <p className="card-map-hint">{m.mapHint}</p>
          {children}
        </div>
      ) : null}
    </section>
  );
}
