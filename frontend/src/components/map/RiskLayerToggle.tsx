import type { RiskLayerConfig } from "./riskLayers";

export interface OverlayLayerConfig {
  id: string;
  label: string;
  color: string;
}

interface LayerToggleProps {
  riskLayers: RiskLayerConfig[];
  overlayLayers?: OverlayLayerConfig[];
  visibleLayers: Set<string>;
  onToggle: (layerId: string) => void;
  /**
   * Consigne d'usage, affichée à côté du titre « Risques » — donc juste au-dessus des
   * cases qu'elle décrit.
   *
   * En prop et non en dur : ce panneau sert toutes les cartes de la page. Une phrase
   * parlant de zones de risque y serait fausse dès qu'une autre carte activerait ses
   * calques.
   */
  hint?: string;
}

function LayerCheckbox({
  id, label, color, checked, onToggle,
}: {
  id: string; label: string; color: string; checked: boolean; onToggle: (id: string) => void;
}) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={() => onToggle(id)} />
      <span className="swatch" style={{ backgroundColor: color }} />
      {label}
    </label>
  );
}

export function LayerTogglePanel({ riskLayers, overlayLayers = [], visibleLayers, onToggle, hint }: LayerToggleProps) {
  return (
    <div className="layer-toggle-panel">
      <div className="layer-toggle-group">
        <span className="layer-toggle-title">
          Risques
          {hint && <span className="layer-toggle-hint">{hint}</span>}
        </span>
        {riskLayers.map((l) => (
          <LayerCheckbox key={l.id} id={l.id} label={l.label} color={l.color}
            checked={visibleLayers.has(l.id)} onToggle={onToggle} />
        ))}
      </div>
      {overlayLayers.length > 0 && (
        <div className="layer-toggle-group">
          <span className="layer-toggle-title">Calques</span>
          {overlayLayers.map((l) => (
            <LayerCheckbox key={l.id} id={l.id} label={l.label} color={l.color}
              checked={visibleLayers.has(l.id)} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
