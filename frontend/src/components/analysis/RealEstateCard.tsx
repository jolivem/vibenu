import type { ReactNode } from "react";
import type { RealEstateMessages } from "@/i18n/messages/fr/analysis/realEstate";
import type { RealEstateAnalysisDto } from "@/types/location-analysis";

interface Props {
  realEstate: RealEstateAnalysisDto;
  m: RealEstateMessages;
  /** Carte thématique, rendue en fin de card et débordant jusqu'à ses bords. */
  children?: ReactNode;
}

/**
 * Surface de l'exemple chiffré sous la médiane : un deux-pièces courant, pour traduire un
 * prix au m² en ordre de grandeur d'un achat.
 */
const EXAMPLE_SURFACE = 50;

export function RealEstateCard({ realEstate, m, children }: Props) {
  return (
    <section className="card">
      <h2>{m.title}</h2>
      {realEstate.medianPricePerSquareMeter ? (
        <>
          <p>{m.median(realEstate.medianPricePerSquareMeter)}</p>
          <p className="real-estate-example">
            {m.example(EXAMPLE_SURFACE, Math.round((realEstate.medianPricePerSquareMeter * EXAMPLE_SURFACE) / 1000) * 1000)}
          </p>
        </>
      ) : null}
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
