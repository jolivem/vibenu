export interface RiskLayerConfig {
  id: string;
  label: string;
  riskCode: string;
  wmsBaseUrl: string;
  wmsLayers: string;
  color: string;
}

const BRGM = "https://geoservices.brgm.fr/risques";
const GEORISQUES = "https://mapsref.brgm.fr/wxs/georisques/risques";

export const RISK_LAYERS: RiskLayerConfig[] = [
  {
    id: "risk-argile",
    label: "Retrait-gonflement argiles",
    riskCode: "retraitGonflementArgile",
    wmsBaseUrl: BRGM,
    wmsLayers: "ALEARG",
    color: "#e67e22",
  },
  {
    id: "risk-inondation",
    label: "Zones inondables (PPR)",
    riskCode: "inondation",
    wmsBaseUrl: GEORISQUES,
    wmsLayers: "PPRN_ZONE_INOND",
    color: "#3498db",
  },
  {
    id: "risk-seisme",
    label: "Zonage sismique",
    riskCode: "seisme",
    wmsBaseUrl: BRGM,
    wmsLayers: "SIS",
    color: "#9b59b6",
  },
  {
    id: "risk-radon",
    label: "Potentiel radon",
    riskCode: "radon",
    wmsBaseUrl: GEORISQUES,
    wmsLayers: "RADON_COMMUNE",
    color: "#f39c12",
  },
];

export function buildWmsTileUrl(layer: RiskLayerConfig): string {
  const params = [
    "SERVICE=WMS",
    "VERSION=1.3.0",
    "REQUEST=GetMap",
    `LAYERS=${layer.wmsLayers}`,
    "CRS=EPSG:3857",
    "BBOX={bbox-epsg-3857}",
    "WIDTH=256",
    "HEIGHT=256",
    "FORMAT=image/png",
    "TRANSPARENT=true",
    "STYLES=",
  ].join("&");

  return `${layer.wmsBaseUrl}?${params}`;
}
