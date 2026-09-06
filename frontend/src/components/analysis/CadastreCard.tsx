import type { CadastreAnalysisDto } from "@/types/location-analysis";
import { formatFr } from "@/lib/format";
import { pluZoneLongLabel, pluZoneType } from "./pluZone";

function formatSurface(m2: number): string {
  if (m2 >= 10_000) {
    return `${(m2 / 10_000).toFixed(2)} ha`;
  }
  return `${formatFr(m2)} m²`;
}

/**
 * Le zonage, en séparant ce qui est national de ce qui ne l'est pas.
 *
 * La pastille et sa glose viennent du code de l'urbanisme et valent partout ; le code de
 * secteur, lui, est propre au PLU de la commune. La dernière phrase existe pour que le
 * lecteur ne prenne pas « Urbain » pour la définition de « UA » : c'est exactement la
 * confusion que la ligne entretenait quand elle se terminait sur un libellé vide.
 */
function UrbanZoneSection({ zone }: { zone: NonNullable<CadastreAnalysisDto["urbanZone"]> }) {
  const type = pluZoneType(zone.type);
  const longLabel = pluZoneLongLabel(zone.label);

  return (
    <div className="cadastre-section">
      <h3>Zone PLU</h3>
      <div className="cadastre-zone">
        <span className={type.className}>{type.label}</span>
        <span className="cadastre-zone-code">{zone.code}</span>
        {longLabel && <span className="cadastre-zone-label">{longLabel}</span>}
      </div>
      {type.gloss && (
        <p className="cadastre-zone-gloss">
          <strong>{type.label}</strong> : {type.gloss}. Seule cette catégorie est
          nationale — le détail du secteur «&nbsp;{zone.code}&nbsp;» est fixé par le
          règlement du PLU de la commune.
        </p>
      )}
    </div>
  );
}

export function CadastreCard({ cadastre }: { cadastre: CadastreAnalysisDto }) {
  if (!cadastre.parcel && !cadastre.urbanZone) {
    return null;
  }

  return (
    <section className="card">
      <h2>Cadastre & urbanisme</h2>

      {cadastre.parcel && (
        <div className="cadastre-section">
          <h3>Parcelle</h3>
          <div className="cadastre-grid">
            <div className="cadastre-item">
              <span className="cadastre-label">Référence</span>
              <span className="cadastre-value">
                Section {cadastre.parcel.section}, n° {cadastre.parcel.numero}
              </span>
            </div>
            <div className="cadastre-item">
              <span className="cadastre-label">Surface</span>
              <span className="cadastre-value">{formatSurface(cadastre.parcel.contenance)}</span>
            </div>
            <div className="cadastre-item">
              <span className="cadastre-label">Commune</span>
              <span className="cadastre-value">{cadastre.parcel.commune}</span>
            </div>
          </div>
        </div>
      )}

      {cadastre.urbanZone && <UrbanZoneSection zone={cadastre.urbanZone} />}

      {cadastre.prescriptions.length > 0 && (
        <div className="cadastre-section">
          <h3>Prescriptions d'urbanisme</h3>
          <ul className="cadastre-prescriptions">
            {cadastre.prescriptions.map((p, i) => (
              <li key={i}>{p.label}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
