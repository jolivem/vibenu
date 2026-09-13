import type { ReactNode } from "react";
import type { SchoolSectorDto } from "@/types/location-analysis";

const NIVEAU_LABEL: Record<SchoolSectorDto["niveau"], string> = {
  college: "Collège de secteur",
  lycee: "Lycée de secteur",
};

export function SchoolSectorCard({
  schoolSector,
  children,
}: {
  schoolSector: SchoolSectorDto;
  /** Carte thématique, rendue en fin de card et débordant jusqu'à ses bords. */
  children?: ReactNode;
}) {
  return (
    <section className="card">
      <h2>Carte scolaire</h2>

      {/* Même gabarit que la parcelle de la card Cadastre : l'établissement en valeur
          principale, l'adresse en ligne secondaire. C'était un tableau libellé / valeur
          où le nom du collège pesait autant que son code UAI, identifiant administratif
          que presque personne ne sait lire — il descend en note. */}
      <div className="cadastre-section">
        <h3>{NIVEAU_LABEL[schoolSector.niveau]}</h3>
        <p className="cadastre-headline">{schoolSector.nomEtablissement}</p>
        {schoolSector.adresse && <p className="cadastre-subline">{schoolSector.adresse}</p>}
      </div>

      {children ? (
        <div className="card-map">
          {/* Sans légende, la zone colorée pouvait se lire comme le quartier IRIS de la
              rubrique Population, ou comme un rayon autour de l'adresse. */}
          <p className="card-map-hint">
            La zone colorée est le secteur {schoolSector.niveau === "college" ? "du collège" : "du lycée"} :
            toutes les adresses qu&apos;elle contient y sont rattachées.
          </p>
          {children}
        </div>
      ) : null}

      <p className="elections-footnote">
        Sectorisation publique officielle.
        {schoolSector.codeUai && ` Code UAI de l'établissement : ${schoolSector.codeUai}.`}
      </p>
    </section>
  );
}
