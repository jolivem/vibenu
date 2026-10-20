import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { ignTransformRequest } from "@/components/map/basemaps";
import { computeBbox } from "@/components/map/Map";
import type { GeoJsonGeometryDto } from "@/types/location-analysis";

/**
 * Format de la capture, en pixels CSS : le rapport 3:1 du bandeau de carte du PDF
 * (`pdfStyles.mapImage`, ~515 × 170 pt). Capturer la carte affichée à l'écran ne
 * marchait pas : sur téléphone elle est en portrait, et le `objectFit: "cover"` du PDF
 * n'en gardait qu'une fine bande centrale — la parcelle occupait tout le cadre.
 * 900 px de large gardent les libellés du fond lisibles une fois réduits à ~515 pt.
 */
const CAPTURE_WIDTH = 900;
const CAPTURE_HEIGHT = 300;

/**
 * Zoom d'une analyse d'adresse : à 900 px, ~1,4 km × 470 m à Paris — la parcelle et
 * son quartier. L'écran, lui, s'ouvre au 17 sur la parcelle.
 */
const ADDRESS_ZOOM = 16;

/** Au-delà, on capture la carte telle quelle plutôt que de bloquer le PDF. */
const IDLE_TIMEOUT_MS = 15_000;

const ADDRESS_POINT_SOURCE = "pdf-address-point";

export interface MapCaptureTarget {
  lat: number;
  lon: number;
  /** Mode commune : le cadre suit le contour. Sinon, zoom de quartier sur l'adresse. */
  communeContour?: GeoJsonGeometryDto;
}

function waitForIdle(map: MapLibreMap): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, IDLE_TIMEOUT_MS);
    map.once("idle", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Rend la carte du PDF sur une copie hors écran de la carte de localisation : même
 * style, mêmes calques et mêmes données (`getStyle()`), mais au format et au zoom du
 * PDF. La carte affichée n'est ni redimensionnée ni déplacée.
 */
export async function captureMap(source: MapLibreMap, target: MapCaptureTarget): Promise<string> {
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${CAPTURE_WIDTH}px;height:${CAPTURE_HEIGHT}px;visibility:hidden;`;
  document.body.appendChild(container);

  const bbox = target.communeContour ? computeBbox(target.communeContour) : null;
  const map = new maplibregl.Map({
    container,
    style: source.getStyle(),
    center: [target.lon, target.lat],
    zoom: ADDRESS_ZOOM,
    ...(bbox ? { bounds: bbox, fitBoundsOptions: { padding: 16 } } : {}),
    interactive: false,
    attributionControl: false,
    preserveDrawingBuffer: true,
    pixelRatio: 2,
    fadeDuration: 0,
    transformRequest: ignTransformRequest,
  });

  try {
    await new Promise<void>((resolve) => map.once("load", () => resolve()));

    // Le marqueur de l'écran est un élément DOM, absent du canvas : on le redessine.
    if (!bbox) {
      map.addSource(ADDRESS_POINT_SOURCE, {
        type: "geojson",
        data: { type: "Point", coordinates: [target.lon, target.lat] },
      });
      map.addLayer({
        id: ADDRESS_POINT_SOURCE,
        type: "circle",
        source: ADDRESS_POINT_SOURCE,
        paint: {
          "circle-radius": 7,
          "circle-color": "#0066cc",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }

    await waitForIdle(map);
    return map.getCanvas().toDataURL("image/png");
  } finally {
    map.remove();
    container.remove();
  }
}
