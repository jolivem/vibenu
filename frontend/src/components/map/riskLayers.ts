export interface RiskLayerConfig {
  id: string;
  label: string;
  riskCode: string;
  wmsBaseUrl: string;
  wmsLayers: string;
  color: string;
  /**
   * Le créneau de zoom où le serveur veut bien dessiner la couche.
   *
   * MapServer coupe ses couches à l'échelle (`MinScaleDenominator` /
   * `MaxScaleDenominator`) : hors du créneau, il répond une image **entièrement
   * transparente en HTTP 200**, pas une erreur. Sans ces bornes, l'aplat disparaissait
   * donc purement et simplement quand on zoomait — aucune trace en console, la case
   * restant cochée.
   *
   * Passées à la source raster, elles changent tout : sous `minzoom` MapLibre ne demande
   * plus rien, et au-dessus de `maxzoom` il réétire les dernières tuiles obtenues plutôt
   * que d'en réclamer de vides — le même mécanisme que celui décrit sur le MNT LiDAR
   * dans `basemaps.ts`. L'aplat devient un peu flou en zoom serré, mais il reste là.
   *
   * Les valeurs sont **mesurées sur tuile réelle**, pas déduites : les capacités WMS ne
   * déclarent d'échelles que pour l'inondation (30 000 à 1 500 000, ce qui tombe
   * exactement sur z9–z14), et pas du tout côté geoservices.brgm.fr.
   */
  minzoom: number;
  maxzoom: number;
}

const BRGM = "https://geoservices.brgm.fr/risques";

/**
 * Le service de tuiles de Géorisques, **sans son mapfile `risques`**.
 *
 * `mapsref.brgm.fr/wxs/georisques/risques` — qui servait les zonages PPR d'inondation et
 * le potentiel radon par commune — est cassé côté BRGM : toute requête, `GetCapabilities`
 * comprise, répond « loadLayer(): Unknown identifier. Parsing error near (ITEMS):(line 666) ».
 * Et comme MapServer renvoie ce message en **HTTP 200 / text/html**, MapLibre le prend pour
 * une tuile et lève `InvalidStateError: The source image could not be decoded.`
 *
 * Le mapfile `rapport`, lui, répond : c'est celui retenu ici. Aucun des deux ne publie plus
 * de couche radon — la case a donc été retirée du panneau, la classe de potentiel radon
 * restant affichée en texte dans la card (elle vient de l'API REST, qui fonctionne).
 */
const GEORISQUES_RAPPORT = "https://mapsref.brgm.fr/wxs/georisques/rapport";

export const RISK_LAYERS: RiskLayerConfig[] = [
  {
    id: "risk-argile",
    label: "Retrait-gonflement argiles",
    riskCode: "retraitGonflementArgile",
    wmsBaseUrl: BRGM,
    wmsLayers: "ALEARG",
    color: "#e67e22",
    // Mesuré à Montauban, en plein aléa argile : plein de z6 à z16, vide dès z17.
    minzoom: 6,
    maxzoom: 16,
  },
  /**
   * Les surfaces inondables des TRI, et non plus les zonages PPR : le mapfile qui servait
   * ces derniers est mort (voir `GEORISQUES_RAPPORT`).
   *
   * `DI_COVADIS_ALEA_SYNT` est la couche groupée — tous aléas (débordement de cours d'eau,
   * ruissellement, submersion marine) et toutes fréquences confondus. La demander en bloc
   * évite d'empiler dix sources pour un seul aplat bleu.
   *
   * Sa couverture n'est pas nationale : les TRI ne portent que sur les territoires à risque
   * important d'inondation, c'est-à-dire les agglomérations. Vérifié sur tuile réelle :
   * données à Bordeaux, Paris, Lyon, Tours, Nevers, Quimper, Arles ; rien à Guéret, Aubusson
   * ou dans le Cantal rural. D'où le libellé explicite « (TRI) » — une case « zones
   * inondables » restée vide laisserait croire à l'absence de risque.
   */
  {
    id: "risk-inondation",
    label: "Surfaces inondables (TRI)",
    riskCode: "inondation",
    wmsBaseUrl: GEORISQUES_RAPPORT,
    wmsLayers: "DI_COVADIS_ALEA_SYNT",
    color: "#3498db",
    // Mesuré à Tours, Bordeaux et Lyon : plein de z9 à z14, vide de part et d'autre —
    // soit exactement les échelles 1 500 000 et 30 000 déclarées par le service.
    minzoom: 9,
    maxzoom: 14,
  },
  {
    id: "risk-seisme",
    label: "Zonage sismique",
    riskCode: "seisme",
    wmsBaseUrl: BRGM,
    wmsLayers: "SIS",
    color: "#9b59b6",
    // Mesuré à Nice et Annecy : plein de z6 à z11, vide dès z12. C'est le créneau le plus
    // étroit des trois, et `SIS` dessine des symboles d'épicentres — réétirés jusqu'au
    // zoom d'une adresse, ils deviennent de grosses pastilles floues.
    minzoom: 6,
    maxzoom: 11,
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
