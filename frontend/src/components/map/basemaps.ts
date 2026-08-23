import type { StyleSpecification } from "maplibre-gl";

/**
 * Catalogue des fonds de carte candidats pour la V2.
 *
 * Les styles IGN sont servis par la Géoplateforme (cartes.gouv.fr / data.geopf.fr),
 * sans clé API ni quota. Ce sont des styles MapLibre spec v8 complets (sprite +
 * glyphs hébergés côté IGN), donc directement consommables comme `style` d'une Map.
 *
 * Attribution obligatoire : « IGN-F/Géoportail ».
 */

const IGN_VECTOR_STYLE = (name: string) =>
  `https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/${name}.json`;

const IGN_ATTRIBUTION =
  '&copy; <a href="https://www.ign.fr/">IGN-F/Géoportail</a>';

export type IgnStyleName =
  | "standard"
  | "classique"
  | "gris"
  | "attenue"
  | "accentue"
  | "sans_toponymes";

/**
 * Fond de la carte de localisation : le rendu complet, avec les **numéros de rue**.
 * Sur une application qui analyse une adresse, voir le numéro s'afficher confirme
 * visuellement qu'on regarde le bon bâtiment — ce que le rendu OSM standard ne fait pas.
 */
export const LOCATOR_BASEMAP: IgnStyleName = "standard";

/**
 * Fond des cartes thématiques (DVF, risques, IRIS) : le fond doit s'effacer sous les
 * aplats colorés. `gris` conserve la lisibilité des toponymes ; passer à
 * `sans_toponymes` (291 couches au lieu de 425) si les libellés gênent encore.
 */
export const THEMATIC_BASEMAP: IgnStyleName = "gris";

/**
 * Charge un style vectoriel IGN, **mutualisé entre toutes les cartes de la page**.
 *
 * Chaque style pèse ~288 Ko de JSON. Avec plusieurs cartes sur l'écran d'analyse, les
 * laisser le télécharger chacune de leur côté serait un gâchis : le cache est au niveau
 * du module, donc la requête n'est faite qu'une fois par style et par session.
 *
 * Le style est cloné avant d'être rendu, pour qu'une carte ne puisse pas corrompre
 * l'objet partagé avec les autres.
 *
 * L'attribution est injectée ici : le TileJSON de la Géoplateforme n'en contient aucune,
 * alors qu'elle est obligatoire (« IGN-F/Géoportail »). Sans ça, MapLibre n'affiche rien.
 */
const styleCache = new Map<string, Promise<StyleSpecification>>();

export function loadIgnStyle(name: IgnStyleName): Promise<StyleSpecification> {
  let pending = styleCache.get(name);

  if (!pending) {
    pending = fetch(IGN_VECTOR_STYLE(name))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Style IGN "${name}" indisponible (HTTP ${response.status})`);
        }
        return response.json() as Promise<StyleSpecification>;
      })
      .then((style) => {
        for (const source of Object.values(style.sources)) {
          (source as { attribution?: string }).attribution = IGN_ATTRIBUTION;
        }
        return style;
      })
      .catch((error) => {
        // Ne pas mettre un échec en cache : la carte suivante doit pouvoir réessayer.
        styleCache.delete(name);
        throw error;
      });

    styleCache.set(name, pending);
  }

  return pending.then((style) => structuredClone(style));
}

/** Fond actuel de l'application — tuiles raster tapées en direct sur l'OSMF. */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** Ortho-photographie IGN (WMTS raster). Seule ortho gratuite et légale sur la France :
 *  OpenStreetMap est une base vectorielle et ne diffuse aucune imagerie. */
export const IGN_ORTHO_STYLE = ignRasterStyle("ORTHOIMAGERY.ORTHOPHOTOS", {
  format: "image/jpeg",
});

/**
 * Construit un style ne contenant qu'une couche WMTS raster de la Géoplateforme.
 *
 * Les paramètres (format, style, plage de zoom) diffèrent d'une couche à l'autre et
 * ne sont pas devinables : ils viennent du GetCapabilities
 * (`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities`, 686 couches).
 * Se tromper de format renvoie un 400 avec une exception XML, pas une tuile vide.
 */
function ignRasterStyle(
  layer: string,
  { format = "image/png", style = "normal", maxzoom = 19 } = {},
): StyleSpecification {
  return {
    version: 8,
    sources: {
      src: {
        type: "raster",
        tiles: [
          "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
            `&LAYER=${layer}&STYLE=${encodeURIComponent(style)}&TILEMATRIXSET=PM` +
            `&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${encodeURIComponent(format)}`,
        ],
        tileSize: 256,
        maxzoom,
        attribution: IGN_ATTRIBUTION,
      },
    },
    layers: [{ id: "src", type: "raster", source: "src" }],
  };
}

/** Plan IGN en raster (WMTS) — utile pour comparer au vectoriel à iso-contenu. */
export const IGN_PLAN_RASTER_STYLE = ignRasterStyle("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2");

/**
 * Calque IGN réellement superposable : transparent, il se pose sur n'importe quel fond.
 *
 * À ne pas confondre avec les cartes historiques ci-dessous, qui sont des rasters
 * opaques couvrant tout : elles remplacent le fond au lieu de s'y ajouter.
 */
export const IGN_PARCELLAIRE_TILES =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
  "&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&TILEMATRIXSET=PM" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png";

export interface BasemapOption {
  id: string;
  label: string;
  /** Une phrase sur ce que ce fond apporte (ou coûte). */
  note: string;
  style: string | StyleSpecification;
  /** Vectoriel = restylable (mode sombre, désaturation) ; raster = figé. */
  vector: boolean;
}

export const BASEMAPS: BasemapOption[] = [
  {
    id: "osm",
    label: "OSM raster — actuel",
    note: "Le fond en place aujourd'hui. Contraire à la tile usage policy de l'OSMF en production, et trop coloré sous des couches thématiques.",
    style: OSM_RASTER_STYLE,
    vector: false,
  },
  {
    id: "ign-standard",
    label: "IGN Plan — standard",
    note: "Le rendu de référence de cartes.gouv.fr. Riche en détail, bon pour une carte de localisation.",
    style: IGN_VECTOR_STYLE("standard"),
    vector: true,
  },
  {
    id: "ign-classique",
    label: "IGN Plan — classique",
    note: "Variante au rendu plus proche d'une carte topographique IGN papier.",
    style: IGN_VECTOR_STYLE("classique"),
    vector: true,
  },
  {
    id: "ign-gris",
    label: "IGN Plan — gris",
    note: "Niveaux de gris. Le candidat naturel pour les cartes thématiques : les couleurs des données ressortent sans concurrence.",
    style: IGN_VECTOR_STYLE("gris"),
    vector: true,
  },
  {
    id: "ign-attenue",
    label: "IGN Plan — atténué",
    note: "Couleurs désaturées mais conservées. Compromis entre le gris et le standard.",
    style: IGN_VECTOR_STYLE("attenue"),
    vector: true,
  },
  {
    id: "ign-accentue",
    label: "IGN Plan — accentué",
    note: "Contrastes renforcés. Plutôt destiné à l'accessibilité qu'à un fond de données.",
    style: IGN_VECTOR_STYLE("accentue"),
    vector: true,
  },
  {
    id: "ign-sans-toponymes",
    label: "IGN Plan — sans toponymes",
    note: "291 couches au lieu de 425 : aucun libellé. Le fond le plus neutre possible sous des polygones DVF ou un WMS d'aléa.",
    style: IGN_VECTOR_STYLE("sans_toponymes"),
    vector: true,
  },
  {
    id: "ign-plan-raster",
    label: "IGN Plan — raster (WMTS)",
    note: "Même cartographie en raster : plus simple à intégrer, mais non restylable et pas de mode sombre.",
    style: IGN_PLAN_RASTER_STYLE,
    vector: false,
  },
  {
    id: "ign-ortho",
    label: "IGN Ortho-photo",
    note: "Vue aérienne. Pertinente en option sur la carte de localisation pour situer une parcelle. Aucun équivalent côté OSM, qui ne diffuse pas d'imagerie.",
    style: IGN_ORTHO_STYLE,
    vector: false,
  },

  /* --- Fonds historiques ---------------------------------------------------
   * Rasters opaques : ce sont des fonds de remplacement, pas des calques.
   * Format et plage de zoom relevés dans le GetCapabilities — ils diffèrent
   * d'une couche à l'autre (jpeg pour l'état-major et le SCAN 50, png pour Cassini).
   */
  {
    id: "ign-cassini",
    label: "IGN — Carte de Cassini (18e s.)",
    note: "Le plus ancien levé national. Plafonne à z14, donc inutilisable sur une adresse précise. Intérêt éditorial plutôt qu'analytique.",
    style: ignRasterStyle("BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI", { maxzoom: 14 }),
    vector: false,
  },
  {
    id: "ign-etatmajor",
    label: "IGN — État-major (1820-1866)",
    note: "Jusqu'à z15. Montre l'emprise du bâti avant l'urbanisation : parlant en rideau avant/après sur une commune périurbaine.",
    style: ignRasterStyle("GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40", {
      format: "image/jpeg",
      maxzoom: 15,
    }),
    vector: false,
  },
  {
    id: "ign-scan50-1950",
    label: "IGN — Carte 1950 (SCAN 50)",
    note: "Jusqu'à z15. L'état du territoire avant les grands ensembles et les rocades.",
    style: ignRasterStyle("GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950", {
      format: "image/jpeg",
      maxzoom: 15,
    }),
    vector: false,
  },
  {
    id: "ign-ortho-1950",
    label: "IGN — Photos aériennes 1950-1965",
    note: "Jusqu'à z18, donc exploitable à l'échelle de la parcelle. Le meilleur candidat des historiques pour un avant/après sur une adresse.",
    style: ignRasterStyle("ORTHOIMAGERY.ORTHOPHOTOS.1950-1965", { maxzoom: 18 }),
    vector: false,
  },
];
