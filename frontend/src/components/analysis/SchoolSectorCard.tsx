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

      <div className="cadastre-section">
        <h3>{NIVEAU_LABEL[schoolSector.niveau]}</h3>
        <div className="cadastre-grid">
          <div className="cadastre-item">
            <span className="cadastre-label">Établissement</span>
            <span className="cadastre-value">{schoolSector.nomEtablissement}</span>
          </div>
          {schoolSector.adresse && (
            <div className="cadastre-item">
              <span className="cadastre-label">Adresse</span>
              <span className="cadastre-value">{schoolSector.adresse}</span>
            </div>
          )}
          {schoolSector.codeUai && (
            <div className="cadastre-item">
              <span className="cadastre-label">Code UAI</span>
              <span className="cadastre-value">{schoolSector.codeUai}</span>
            </div>
          )}
        </div>
        <p className="cadastre-note">
          Sectorisation publique officielle. Le secteur est tracé sur la carte ci-dessous.
        </p>
      </div>
      {children ? <div className="card-map">{children}</div> : null}
    </section>
  );
}
