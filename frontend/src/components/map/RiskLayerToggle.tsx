import type { RiskLayerConfig } from "./riskLayers";

interface RiskLayerToggleProps {
  layers: RiskLayerConfig[];
  visibleLayers: Set<string>;
  onToggle: (layerId: string) => void;
}

export function RiskLayerToggle({ layers, visibleLayers, onToggle }: RiskLayerToggleProps) {
  return (
    <div className="risk-layer-toggle">
      <span className="risk-layer-toggle-title">Couches de risques</span>
      {layers.map((layer) => (
        <label key={layer.id}>
          <input
            type="checkbox"
            checked={visibleLayers.has(layer.id)}
            onChange={() => onToggle(layer.id)}
          />
          <span className="swatch" style={{ backgroundColor: layer.color }} />
          {layer.label}
        </label>
      ))}
    </div>
  );
}
