import type { RiskLayerConfig } from "./riskLayers";

export interface OverlayLayerConfig {
  id: string;
  label: string;
  color: string;
}

interface RiskLayerToggleProps {
  layers: RiskLayerConfig[];
  overlayLayers?: OverlayLayerConfig[];
  visibleLayers: Set<string>;
  onToggle: (layerId: string) => void;
}

export function RiskLayerToggle({ layers, overlayLayers = [], visibleLayers, onToggle }: RiskLayerToggleProps) {
  return (
    <div className="risk-layer-toggle">
      <span className="risk-layer-toggle-title">Couches</span>
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
      {overlayLayers.map((layer) => (
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
