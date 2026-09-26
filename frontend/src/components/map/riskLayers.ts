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
 * Ce que Géorisques ne sert plus — à ne pas retenter sans vérifier.
 *
 * `mapsref.brgm.fr/wxs/georisques/risques` servait les zonages PPR d'inondation
 * (`PPRN_ZONE_INOND`) et le potentiel radon par commune (`RADON_COMMUNE`). Il est cassé
 * côté BRGM : toute requête, `GetCapabilities` comprise, répond « loadLayer(): Unknown
 * identifier. Parsing error near (ITEMS):(line 666) ». Et comme MapServer renvoie ce
 * message en **HTTP 200 / text/html**, MapLibre le prend pour une tuile et lève
 * `InvalidStateError: The source image could not be decoded.`
 *
 * Les deux couches ont été remplacées différemment :
 * - **inondation** → les zonages PPR sont repris au Géoportail de l'Urbanisme, en
 *   vectoriel, par `server-modules/risks/infrastructure/gpu-flood-zone.provider.ts`. Le
 *   détour par les surfaces inondables des TRI (`DI_COVADIS_ALEA_SYNT`, mapfile `rapport`)
 *   a été abandonné : les TRI ne couvrent que les agglomérations, et ignoraient par
 *   exemple tous les PPRI de la vallée de la Bièvre.
 * - **radon** → aucun service de tuiles ne le publie plus ; la case a disparu du panneau
 *   et la classe de potentiel reste affichée en texte dans la card, via l'API REST.
 */

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
