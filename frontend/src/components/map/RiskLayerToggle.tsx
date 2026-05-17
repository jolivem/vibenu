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

export function LayerTogglePanel({ riskLayers, overlayLayers = [], visibleLayers, onToggle }: LayerToggleProps) {
  return (
    <div className="layer-toggle-panel">
      <div className="layer-toggle-group">
        <span className="layer-toggle-title">Risques</span>
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
