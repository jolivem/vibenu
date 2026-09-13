import type { CadastreAnalysisDto } from "@/types/location-analysis";
import { formatSurface } from "./cadastreFormat";
import { pluZoneLongLabel, pluZoneType } from "./pluZone";

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
          {/* La surface en chiffre clé : c'est la seule donnée qui se compare et qui pèse
              dans une décision. La référence cadastrale est un identifiant, utile pour
              retrouver la parcelle mais muet en soi — elle suit en ligne secondaire. La
              commune n'est plus répétée : elle est déjà en tête de page.

              Ce bloc était un tableau libellé / valeur ; trois lignes de même poids
              noyaient la surface parmi deux identifiants. */}
          <p className="cadastre-headline">{formatSurface(cadastre.parcel.contenance)}</p>
          <p className="cadastre-subline">
            Section {cadastre.parcel.section} · n° {cadastre.parcel.numero}
          </p>
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
