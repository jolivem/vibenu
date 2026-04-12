import type { CadastreAnalysisDto } from "@/types/location-analysis";

function formatSurface(m2: number): string {
  if (m2 >= 10_000) {
    return `${(m2 / 10_000).toFixed(2)} ha`;
  }
  return `${m2.toLocaleString("fr-FR")} m²`;
}

function zoneTypeBadge(type: string) {
  const config: Record<string, { label: string; className: string }> = {
    U: { label: "Urbain", className: "zone-badge zone-badge--u" },
    AU: { label: "À urbaniser", className: "zone-badge zone-badge--au" },
    A: { label: "Agricole", className: "zone-badge zone-badge--a" },
    N: { label: "Naturel", className: "zone-badge zone-badge--n" },
  };
  const c = config[type] ?? { label: type, className: "zone-badge" };
  return <span className={c.className}>{c.label}</span>;
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

      {cadastre.urbanZone && (
        <div className="cadastre-section">
          <h3>Zone PLU</h3>
          <div className="cadastre-zone">
            {zoneTypeBadge(cadastre.urbanZone.type)}
            <span className="cadastre-zone-code">{cadastre.urbanZone.code}</span>
            <span className="cadastre-zone-label">{cadastre.urbanZone.label}</span>
          </div>
        </div>
      )}

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
