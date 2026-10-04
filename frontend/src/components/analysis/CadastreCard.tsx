import type { CadastreAnalysisDto } from "@/types/location-analysis";
import { RichText } from "@/components/RichText";
import type { CadastreMessages } from "@/i18n/messages/fr/analysis/cadastre";
import { pluZoneLongLabel, pluZoneType } from "./pluZone";

/**
 * Le zonage, en séparant ce qui est national de ce qui ne l'est pas.
 *
 * La pastille et sa glose viennent du code de l'urbanisme et valent partout ; le code de
 * secteur, lui, est propre au PLU de la commune. La dernière phrase existe pour que le
 * lecteur ne prenne pas « Urbain » pour la définition de « UA » : c'est exactement la
 * confusion que la ligne entretenait quand elle se terminait sur un libellé vide.
 */
function UrbanZoneSection({
  zone,
  m,
}: {
  zone: NonNullable<CadastreAnalysisDto["urbanZone"]>;
  m: CadastreMessages;
}) {
  const type = pluZoneType(zone.type, m);
  const longLabel = pluZoneLongLabel(zone.label);

  return (
    <div className="cadastre-section">
      <h3>{m.zoneTitle}</h3>
      <div className="cadastre-zone">
        <span className={type.className}>{type.label}</span>
        <span className="cadastre-zone-code">{zone.code}</span>
        {longLabel && (
          // Texte du PLU, cité tel quel : toujours en français.
          <span className="cadastre-zone-label" lang="fr">
            {longLabel}
          </span>
        )}
      </div>
      {type.gloss && (
        <p className="cadastre-zone-gloss">
          <RichText text={m.zoneGloss(type.label, type.gloss, zone.code)} />
        </p>
      )}
    </div>
  );
}

export function CadastreCard({ cadastre, m }: { cadastre: CadastreAnalysisDto; m: CadastreMessages }) {
  if (!cadastre.parcel && !cadastre.urbanZone) {
    return null;
  }

  return (
    <section className="card">
      <h2>{m.title}</h2>

      {cadastre.parcel && (
        <div className="cadastre-section">
          <h3>{m.parcelTitle}</h3>
          {/* La surface en chiffre clé : c'est la seule donnée qui se compare et qui pèse
              dans une décision. La référence cadastrale est un identifiant, utile pour
              retrouver la parcelle mais muet en soi — elle suit en ligne secondaire. La
              commune n'est plus répétée : elle est déjà en tête de page.

              Ce bloc était un tableau libellé / valeur ; trois lignes de même poids
              noyaient la surface parmi deux identifiants. */}
          <p className="cadastre-headline">{m.surface(cadastre.parcel.contenance)}</p>
          <p className="cadastre-subline">
            {m.parcelReference(cadastre.parcel.section, cadastre.parcel.numero)}
          </p>
        </div>
      )}

      {cadastre.urbanZone && <UrbanZoneSection zone={cadastre.urbanZone} m={m} />}

      {cadastre.prescriptions.length > 0 && (
        <div className="cadastre-section">
          <h3>{m.prescriptionsTitle}</h3>
          <ul className="cadastre-prescriptions" lang="fr">
            {cadastre.prescriptions.map((p, i) => (
              <li key={i}>{p.label}</li>
            ))}
          </ul>
          {m.sourceLanguageNote && <p className="local-tax-detail">{m.sourceLanguageNote}</p>}
        </div>
      )}
    </section>
  );
}
