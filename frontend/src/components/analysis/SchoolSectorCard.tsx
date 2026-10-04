import type { ReactNode } from "react";
import type { SchoolSectorDto } from "@/types/location-analysis";
import type { NearbyMessages } from "@/i18n/messages/fr/analysis/nearby";

export function SchoolSectorCard({
  schoolSector,
  m,
  children,
}: {
  schoolSector: SchoolSectorDto;
  m: NearbyMessages["school"];
  /** Carte thématique, rendue en fin de card et débordant jusqu'à ses bords. */
  children?: ReactNode;
}) {
  return (
    <section className="card">
      <h2>{m.title}</h2>

      {/* Même gabarit que la parcelle de la card Cadastre : l'établissement en valeur
          principale, l'adresse en ligne secondaire. C'était un tableau libellé / valeur
          où le nom du collège pesait autant que son code UAI, identifiant administratif
          que presque personne ne sait lire — il descend en note. */}
      <div className="cadastre-section">
        <h3>{m.levels[schoolSector.niveau]}</h3>
        <p className="cadastre-headline">{schoolSector.nomEtablissement}</p>
        {schoolSector.adresse && <p className="cadastre-subline">{schoolSector.adresse}</p>}
      </div>

      {children ? (
        <div className="card-map">
          {/* Sans légende, la zone colorée pouvait se lire comme le quartier IRIS de la
              rubrique Population, ou comme un rayon autour de l'adresse. */}
          <p className="card-map-hint">{m.mapHint(schoolSector.niveau)}</p>
          {children}
        </div>
      ) : null}

      <p className="elections-footnote">{m.footnote(schoolSector.codeUai)}</p>
    </section>
  );
}
