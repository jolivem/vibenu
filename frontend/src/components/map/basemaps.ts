import type { RasterSourceSpecification, StyleSpecification } from "maplibre-gl";

/**
 * Fonds de carte de l'application.
 *
 * Les styles IGN sont servis par la Géoplateforme (cartes.gouv.fr / data.geopf.fr),
 * sans clé API ni quota. Ce sont des styles MapLibre spec v8 complets (sprite +
 * glyphs hébergés côté IGN), donc directement consommables comme `style` d'une Map.
 *
 * Attribution obligatoire : « IGN-F/Géoportail ».
 *
 * Le comparateur `/map-lab` qui a servi à arbitrer entre ces fonds a été supprimé une
 * fois le choix fait ; son catalogue (OSM, ortho, cartes historiques, parcellaire) est
 * documenté dans PLAN-V2.md, avec les identifiants WMTS et leurs formats.
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

export interface IgnRasterOptions {
  format?: string;
  style?: string;
  maxzoom?: number;
  minzoom?: number;
  /** Remplace la mention IGN, pour une couche co-produite (Cassini est BnF/IGN). */
  attribution?: string;
}

/**
 * Décrit une couche WMTS raster de la Géoplateforme comme source MapLibre.
 *
 * Les paramètres (format, style, plage de zoom) diffèrent d'une couche à l'autre et
 * ne sont pas devinables : ils viennent du GetCapabilities
 * (`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities`, 2 222 couches).
 * Se tromper de format ou de style renvoie un 400 avec une exception XML, pas une
 * tuile vide — `ORTHOIMAGERY.ORTHOPHOTOS.1965-1980` n'accepte ainsi que le style
 * `BDORTHOHISTORIQUE`, jamais `normal`.
 *
 * Passer par cette fonction plutôt que de recopier le gabarit d'URL est ce qui
 * garantit que toutes les sources IGN de la carte portent la mention d'attribution
 * **strictement identique** : MapLibre déduplique les attributions par sous-chaîne,
 * et deux libellés qui divergeraient d'un caractère s'afficheraient côte à côte.
 */
export function ignRasterSource(
  layer: string,
  { format = "image/png", style = "normal", maxzoom = 19, minzoom, attribution }: IgnRasterOptions = {},
): RasterSourceSpecification {
  return {
    type: "raster",
    tiles: [
      "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile" +
        `&LAYER=${layer}&STYLE=${encodeURIComponent(style)}&TILEMATRIXSET=PM` +
        `&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${encodeURIComponent(format)}`,
    ],
    tileSize: 256,
    maxzoom,
    ...(minzoom === undefined ? {} : { minzoom }),
    attribution: attribution ?? IGN_ATTRIBUTION,
  };
}

/** Un style ne contenant que cette seule couche raster — pour l'utiliser comme fond. */
export function ignRasterStyle(layer: string, options?: IgnRasterOptions): StyleSpecification {
  return {
    version: 8,
    sources: { src: ignRasterSource(layer, options) },
    layers: [{ id: "src", type: "raster", source: "src" }],
  };
}

/** Plan IGN en raster (WMTS) — repli si le style vectoriel ne se charge pas : même
 *  cartographie, aucun fetch de style, une seule couche à rendre. */
export const IGN_PLAN_RASTER_STYLE = ignRasterStyle("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2");

/**
 * Photographies aériennes actuelles — le fond des cartes historiques.
 *
 * Trois des six époques disponibles sont elles-mêmes des photographies aériennes :
 * les fondre sur un plan de rues vectoriel opposerait deux langages graphiques au
 * lieu de comparer deux états du même lieu. Et pour les cartes dessinées (Cassini,
 * état-major), le tracé ancien posé sur le terrain d'aujourd'hui est l'usage
 * classique de ces couches.
 */
export const IGN_ORTHO_RASTER_STYLE = ignRasterStyle("ORTHOIMAGERY.ORTHOPHOTOS", {
  format: "image/jpeg",
});
