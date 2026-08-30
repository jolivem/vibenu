"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import maplibregl, { Map as MapLibreMap, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { RISK_LAYERS, buildWmsTileUrl } from "./riskLayers";
import {
  IGN_PLAN_RASTER_STYLE,
  LOCATOR_BASEMAP,
  loadIgnStyle,
  type IgnStyleName,
} from "./basemaps";
import { LayerTogglePanel } from "./RiskLayerToggle";
import type { OverlayLayerConfig } from "./RiskLayerToggle";
import type { CadastreParcelDto, DvfTransactionFeatureDto, GeoJsonGeometryDto, RiskAnalysisDto } from "@/types/location-analysis";
import { formatFr } from "@/lib/format";

/** Exportés pour que les cartes thématiques puissent les passer en `initialLayers`. */
export const DVF_LAYER_ID = "dvf-transactions";
export const IRIS_LAYER_ID = "iris-boundary";
export const SCHOOL_SECTOR_LAYER_ID = "school-sector";
const COMMUNE_LAYER_ID = "commune-contour";

/**
 * Premier calque applicatif de la pile, quelle que soit la configuration : les quatre
 * couches de `RISK_LAYERS` sont ajoutées inconditionnellement, et en tête du bloc de
 * surcouches.
 *
 * Point d'insertion pour toute couche ajoutée après coup qui doit masquer le fond mais
 * rester **sous** nos surcouches — un fond historique opaque doit couvrir l'ortho, mais
 * surtout pas le contour de parcelle : « où était ma parcelle en 1750 » n'a de sens que
 * si le liseré reste visible par-dessus.
 */
export const FIRST_OVERLAY_LAYER_ID = RISK_LAYERS[0].id;

type LngLatBounds = [[number, number], [number, number]];

/**
 * Défaut stable pour `transports`.
 *
 * Un `= []` en valeur par défaut fabrique un tableau neuf à chaque rendu. Comme `transports`
 * est dans les dépendances de l'effet d'initialisation, la carte serait détruite et
 * reconstruite à chaque rendu du parent — et `map.remove()` annulant les requêtes de tuiles
 * en vol, la console se remplirait d'`AbortError`.
 */
const NO_TRANSPORTS: NonNullable<MapProps["transports"]> = [];

/**
 * Applique l'état des cases à cocher aux calques de la carte.
 *
 * Hors composant, pour être appelée aussi bien à l'initialisation (les couches passées en
 * `initialLayers` doivent être allumées dès la construction) qu'au fil des clics.
 */
function applyLayerVisibility(m: MapLibreMap, visibleLayers: Set<string>): void {
  for (const layer of RISK_LAYERS) {
    m.setLayoutProperty(layer.id, "visibility", visibleLayers.has(layer.id) ? "visible" : "none");
  }

  const pairs: Array<[string, string]> = [
    [DVF_LAYER_ID, DVF_LAYER_ID],
    [IRIS_LAYER_ID, IRIS_LAYER_ID],
    [SCHOOL_SECTOR_LAYER_ID, SCHOOL_SECTOR_LAYER_ID],
  ];

  for (const [toggleId, layerPrefix] of pairs) {
    if (!m.getLayer(`${layerPrefix}-fill`)) continue;
    const visibility = visibleLayers.has(toggleId) ? "visible" : "none";
    m.setLayoutProperty(`${layerPrefix}-fill`, "visibility", visibility);
    m.setLayoutProperty(`${layerPrefix}-outline`, "visibility", visibility);
  }
}

function computeBbox(geometry: GeoJsonGeometryDto): LngLatBounds | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  const visit = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const lon = coords[0] as number;
      const lat = coords[1] as number;
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const c of coords) visit(c);
  };

  visit(geometry.coordinates);
  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) return null;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

interface MapProps {
  lat: number;
  lon: number;
  label: string;
  transports?: Array<{ lat: number; lon: number; type: string; name: string }>;
  cadastreParcel?: CadastreParcelDto | null;
  dvfTransactions?: DvfTransactionFeatureDto[];
  irisGeojson?: string | null;
  communeContour?: GeoJsonGeometryDto | null;
  schoolSector?: GeoJsonGeometryDto | null;
  risks?: RiskAnalysisDto;
  onReady?: (map: MapLibreMap) => void;
  height?: string;
  showLayerToggle?: boolean;
  /**
   * Fond de carte. `standard` (numéros de rue) pour la localisation, `gris` sous les
   * couches thématiques, ou un style complet pour un fond raster — `IGN_ORTHO_RASTER_STYLE`
   * sous les cartes historiques.
   *
   * ⚠️ Un style passé en objet doit être une **constante de module**. Un littéral inline
   * fabriquerait un objet neuf à chaque rendu, donc un `baseStyle` d'identité neuve, donc
   * une carte détruite et reconstruite à chaque rendu du parent — le même piège que celui
   * documenté pour `transports` sur `NO_TRANSPORTS`.
   */
  basemap?: IgnStyleName | StyleSpecification;
  /**
   * Couches allumées au montage (`dvf-transactions`, `iris-boundary`, ids de `RISK_LAYERS`…).
   * Les cartes thématiques de l'écran d'analyse illustrent une donnée précise : leur couche
   * doit être visible d'emblée, pas derrière une case à cocher.
   */
  initialLayers?: string[];
  /**
   * Zoom d'arrivée, quand le défaut déduit du contenu ne convient pas.
   *
   * Sans contour communal ni parcelle, le défaut vaut 14 ; une parcelle le pousse à 17,
   * ce qui est trop serré pour une couche qui s'arrête au zoom 14 (Cassini).
   */
  zoom?: number;
}

export function Map({ lat, lon, label, transports = NO_TRANSPORTS, cadastreParcel, dvfTransactions, irisGeojson, communeContour, schoolSector, risks, onReady, height = "400px", showLayerToggle = true, basemap = LOCATOR_BASEMAP, initialLayers, zoom }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  // `initialLayers` n'est lu qu'à l'initialisation : ensuite l'utilisateur est maître des cases.
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(() => new Set(initialLayers));
  // Lu par l'effet d'init, qui doit appliquer l'état courant sans en dépendre — en dépendre
  // reconstruirait la carte à chaque case cochée.
  const visibleLayersRef = useRef(visibleLayers);
  visibleLayersRef.current = visibleLayers;

  const handleToggle = useCallback((layerId: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  }, []);

  // La couche WMS "Zonage sismique" n'apporte rien quand le risque est faible/absent
  // (la France entière est en zone sismique 1+ : Géorisques renvoie toujours "Existant").
  const availableRiskLayers = useMemo(() => {
    const seismeLevel = risks?.categories.find((c) => c.code === "seisme")?.level;
    return RISK_LAYERS.filter((layer) => {
      if (layer.riskCode !== "seisme") return true;
      return seismeLevel === "modéré" || seismeLevel === "élevé";
    });
  }, [risks]);

  const overlayLayers = useMemo<OverlayLayerConfig[]>(() => {
    const layers: OverlayLayerConfig[] = [];
    if (dvfTransactions?.length) {
      layers.push({ id: DVF_LAYER_ID, label: "Prix immobiliers (DVF)", color: "#eab308" });
    }
    if (irisGeojson) {
      layers.push({ id: IRIS_LAYER_ID, label: "Quartier démographique", color: "#8b5cf6" });
    }
    if (schoolSector) {
      layers.push({ id: SCHOOL_SECTOR_LAYER_ID, label: "Secteur collège", color: "#d97706" });
    }
    return layers;
  }, [dvfTransactions, irisGeojson, schoolSector]);

  // Le style IGN est chargé à part : c'est un fetch (~288 Ko), mutualisé entre les cartes
  // de la page par le cache de `loadIgnStyle`. Tant qu'il n'est pas là, la carte n'est pas
  // construite — d'où le garde dans l'effet d'init ci-dessous.
  const [baseStyle, setBaseStyle] = useState<StyleSpecification | null>(null);

  useEffect(() => {
    // Style déjà constitué (fond raster) : rien à charger. Le clone est celui que fait
    // `loadIgnStyle` sur sa branche : l'init étale `baseStyle.sources`, et sans lui les
    // objets de source seraient partagés par référence entre toutes les cartes de la page.
    if (typeof basemap !== "string") {
      setBaseStyle(structuredClone(basemap));
      return;
    }

    let cancelled = false;

    loadIgnStyle(basemap)
      .then((style) => {
        if (!cancelled) setBaseStyle(style);
      })
      .catch((error) => {
        // Repli sur le Plan IGN en raster : même cartographie, aucun fetch de style.
        // On ne retombe volontairement pas sur OSM, dont l'usage en production est
        // contraire à la tile usage policy de l'OSMF.
        console.error("[Map] style IGN indisponible, repli sur le raster:", error);
        if (!cancelled) setBaseStyle(IGN_PLAN_RASTER_STYLE);
      });

    return () => {
      cancelled = true;
    };
  }, [basemap]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !baseStyle) return;

    // Build WMS sources and layers
    const wmsSources: Record<string, maplibregl.SourceSpecification> = {};
    const wmsLayers: maplibregl.LayerSpecification[] = [];

    for (const layer of RISK_LAYERS) {
      wmsSources[layer.id] = {
        type: "raster",
        tiles: [buildWmsTileUrl(layer)],
        tileSize: 256,
      };
      wmsLayers.push({
        id: layer.id,
        type: "raster",
        source: layer.id,
        paint: { "raster-opacity": 0.5 },
        layout: { visibility: "none" },
      });
    }

    // Build DVF transaction sources and layers
    const dvfSources: Record<string, maplibregl.SourceSpecification> = {};
    const dvfLayers: maplibregl.LayerSpecification[] = [];

    if (dvfTransactions?.length) {
      dvfSources[DVF_LAYER_ID] = {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: dvfTransactions as unknown as GeoJSON.Feature[],
        },
      };
      dvfLayers.push(
        {
          id: `${DVF_LAYER_ID}-fill`,
          type: "fill",
          source: DVF_LAYER_ID,
          paint: {
            "fill-color": [
              "interpolate",
              ["linear"],
              ["get", "pricePerSqm"],
              2000, "#22c55e",
              5000, "#eab308",
              10000, "#ef4444",
            ],
            "fill-opacity": 0.5,
          },
          layout: { visibility: "none" },
        },
        {
          id: `${DVF_LAYER_ID}-outline`,
          type: "line",
          source: DVF_LAYER_ID,
          paint: {
            "line-color": "#374151",
            "line-width": 1,
          },
          layout: { visibility: "none" },
        },
      );
    }

    // Build cadastre source if available
    const cadastreSources: Record<string, maplibregl.SourceSpecification> = {};
    const cadastreLayers: maplibregl.LayerSpecification[] = [];

    if (cadastreParcel?.geometry) {
      cadastreSources["cadastre-parcel"] = {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: cadastreParcel.geometry as GeoJSON.Geometry,
          properties: {
            section: cadastreParcel.section,
            numero: cadastreParcel.numero,
            contenance: cadastreParcel.contenance,
          },
        },
      };
      cadastreLayers.push(
        {
          id: "cadastre-parcel-fill",
          type: "fill",
          source: "cadastre-parcel",
          paint: {
            "fill-color": "#0066cc",
            "fill-opacity": 0.15,
          },
        },
        {
          // Liseré blanc sous le contour : sur le Plan IGN, un trait bleu seul se confond avec
          // les bordures de bâti et les filets de voirie. Le halo détache la parcelle du fond.
          id: "cadastre-parcel-casing",
          type: "line",
          source: "cadastre-parcel",
          paint: {
            "line-color": "#ffffff",
            "line-width": 6,
            "line-opacity": 0.9,
          },
        },
        {
          id: "cadastre-parcel-outline",
          type: "line",
          source: "cadastre-parcel",
          paint: {
            "line-color": "#0066cc",
            "line-width": 3,
          },
        },
      );
    }

    // Build commune contour source (always visible when provided)
    const communeSources: Record<string, maplibregl.SourceSpecification> = {};
    const communeLayers: maplibregl.LayerSpecification[] = [];

    if (communeContour) {
      communeSources[COMMUNE_LAYER_ID] = {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: communeContour as GeoJSON.Geometry,
          properties: {},
        },
      };
      communeLayers.push(
        {
          id: `${COMMUNE_LAYER_ID}-fill`,
          type: "fill",
          source: COMMUNE_LAYER_ID,
          paint: {
            "fill-color": "#2563eb",
            "fill-opacity": 0.1,
          },
        },
        {
          id: `${COMMUNE_LAYER_ID}-outline`,
          type: "line",
          source: COMMUNE_LAYER_ID,
          paint: {
            "line-color": "#1d4ed8",
            "line-width": 2,
          },
        },
      );
    }

    // Build IRIS source if available
    const irisSources: Record<string, maplibregl.SourceSpecification> = {};
    const irisLayers: maplibregl.LayerSpecification[] = [];

    // Build school sector source if available (toggleable polygon)
    const schoolSectorSources: Record<string, maplibregl.SourceSpecification> = {};
    const schoolSectorLayers: maplibregl.LayerSpecification[] = [];

    if (schoolSector) {
      schoolSectorSources[SCHOOL_SECTOR_LAYER_ID] = {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: schoolSector as GeoJSON.Geometry,
          properties: {},
        },
      };
      schoolSectorLayers.push(
        {
          id: `${SCHOOL_SECTOR_LAYER_ID}-fill`,
          type: "fill",
          source: SCHOOL_SECTOR_LAYER_ID,
          paint: {
            "fill-color": "#f59e0b",
            "fill-opacity": 0.15,
          },
          layout: { visibility: "none" },
        },
        {
          id: `${SCHOOL_SECTOR_LAYER_ID}-outline`,
          type: "line",
          source: SCHOOL_SECTOR_LAYER_ID,
          paint: {
            "line-color": "#d97706",
            "line-width": 2,
          },
          layout: { visibility: "none" },
        },
      );
    }

    if (irisGeojson) {
      try {
        const geom = JSON.parse(irisGeojson);
        irisSources[IRIS_LAYER_ID] = {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: geom,
            properties: {},
          },
        };
        irisLayers.push(
          {
            id: `${IRIS_LAYER_ID}-fill`,
            type: "fill",
            source: IRIS_LAYER_ID,
            paint: {
              "fill-color": "#8b5cf6",
              "fill-opacity": 0.1,
            },
            layout: { visibility: "none" },
          },
          {
            id: `${IRIS_LAYER_ID}-outline`,
            type: "line",
            source: IRIS_LAYER_ID,
            paint: {
              "line-color": "#8b5cf6",
              "line-width": 2,
              "line-dasharray": [4, 2],
            },
            layout: { visibility: "none" },
          },
        );
      } catch {
        // Invalid GeoJSON, skip
      }
    }

    // Nos couches se posent **au-dessus de toute la géométrie du fond** (voirie, bâti, hydro)
    // mais **sous les libellés**, pour que toponymes et numéros de rue restent lisibles.
    //
    // On ne peut pas viser le *premier* calque symbol : dans `PLAN.IGN/standard` il arrive dès
    // l'index 51 sur 425 (une cote de courbe de niveau), ce qui enterrait la parcelle sous le
    // bâti (index ~122) et la voirie. On vise donc la fin de la géométrie : le dernier calque
    // non-symbol. Seuls 15 libellés mineurs passent alors dessous, contre 374 calques avant.
    // (`sans_toponymes` n'a aucun symbol : l'insertion tombe naturellement à la fin.)
    const overlaySpecs: maplibregl.LayerSpecification[] = [
      ...wmsLayers,
      ...dvfLayers,
      ...irisLayers,
      ...schoolSectorLayers,
      ...communeLayers,
      ...cadastreLayers, // cadastre on top of DVF
    ];

    const layers = [...baseStyle.layers];
    let lastGeometryIndex = -1;
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i].type !== "symbol") {
        lastGeometryIndex = i;
        break;
      }
    }
    layers.splice(lastGeometryIndex + 1, 0, ...overlaySpecs);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      preserveDrawingBuffer: true,
      style: {
        ...baseStyle,
        sources: {
          ...baseStyle.sources,
          ...wmsSources,
          ...dvfSources,
          ...irisSources,
          ...schoolSectorSources,
          ...communeSources,
          ...cadastreSources,
        },
        layers,
      },
      center: [lon, lat],
      zoom: zoom ?? (communeContour ? 10 : cadastreParcel ? 17 : 14),
    });

    // Les calques naissent en `visibility: none` : c'est ici qu'`initialLayers` prend effet.
    // Le faire depuis l'effet de synchronisation ne marcherait pas — ses dépendances n'ont
    // pas bougé entre le rendu sans carte et celui où elle existe, il ne se relancerait pas.
    {
      const m = map.current;
      m.once("style.load", () => applyLayerVisibility(m, visibleLayersRef.current));
    }

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    onReadyRef.current?.(map.current);

    // Pas de marker en mode commune — le contour est l'élément central
    if (communeContour) {
      const bbox = computeBbox(communeContour);
      if (bbox) {
        map.current.fitBounds(bbox, { padding: 24, duration: 0 });
      }
    } else {
      new maplibregl.Marker({ color: "#0066cc" })
        .setLngLat([lon, lat])
        .setPopup(new maplibregl.Popup().setText(label))
        .addTo(map.current);

      // Le secteur est le sujet de sa carte, pas une surcouche : il doit tenir dans le cadre.
      // Le zoom 14 par défaut couvre ~3 km, ce qui suffit en ville mais coupe un secteur rural.
      if (schoolSector) {
        const bbox = computeBbox(schoolSector);
        if (bbox) {
          map.current.fitBounds(bbox, { padding: 24, duration: 0 });
        }
      }
    }

    // Pas de markers transport en mode commune
    // (ils seraient tous empilés sur le centroïde, sans valeur informative)
    if (!communeContour) {
      transports.forEach((transport) => {
        const markerColor = transport.type === "train" ? "#ff6b6b" : "#ffc107";
        const marker = new maplibregl.Marker({ color: markerColor });
        marker.setLngLat([transport.lon, transport.lat]);
        marker.setPopup(new maplibregl.Popup().setText(`${transport.type}: ${transport.name}`));
        marker.addTo(map.current!);
      });
    }

    // DVF popup on click
    if (dvfTransactions?.length) {
      const m = map.current;
      m.on("click", `${DVF_LAYER_ID}-fill`, (e) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties;
        const html = `
          <strong>${formatFr(Number(props.pricePerSqm))} €/m²</strong><br/>
          Prix : ${formatFr(Number(props.price))} €<br/>
          Surface : ${props.surface} m²<br/>
          Date : ${props.date}<br/>
          ${props.propertyType}
        `;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(m);
      });
      m.on("mouseenter", `${DVF_LAYER_ID}-fill`, () => {
        m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", `${DVF_LAYER_ID}-fill`, () => {
        m.getCanvas().style.cursor = "";
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [baseStyle, lat, lon, label, transports, cadastreParcel, dvfTransactions, irisGeojson, communeContour, schoolSector, zoom]);

  // Répercute les clics sur les cases. Le cas « la carte n'existe pas encore » est traité par
  // l'effet d'init lui-même, pas ici : cet effet ne se relancerait pas, ses dépendances ne
  // bougeant pas entre le rendu sans carte et celui où elle apparaît.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    if (m.isStyleLoaded()) {
      applyLayerVisibility(m, visibleLayers);
    } else {
      const handler = () => applyLayerVisibility(m, visibleLayers);
      m.once("style.load", handler);
      return () => {
        m.off("style.load", handler);
      };
    }
  }, [visibleLayers]);

  return (
    <div className="map-wrapper">
      <div
        ref={mapContainer}
        className="map-container"
        style={{
          width: "100%",
          height,
          borderRadius: "8px",
          overflow: "hidden",
        }}
      />
      {showLayerToggle && (
        <LayerTogglePanel
          riskLayers={availableRiskLayers}
          overlayLayers={overlayLayers}
          visibleLayers={visibleLayers}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}
