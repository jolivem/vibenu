"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { RISK_LAYERS, buildWmsTileUrl } from "./riskLayers";
import { LayerTogglePanel } from "./RiskLayerToggle";
import type { OverlayLayerConfig } from "./RiskLayerToggle";
import type { CadastreParcelDto, DvfTransactionFeatureDto, GeoJsonGeometryDto } from "@/types/location-analysis";

const DVF_LAYER_ID = "dvf-transactions";
const IRIS_LAYER_ID = "iris-boundary";
const COMMUNE_LAYER_ID = "commune-contour";

type LngLatBounds = [[number, number], [number, number]];

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
  onReady?: (map: MapLibreMap) => void;
}

export function Map({ lat, lon, label, transports = [], cadastreParcel, dvfTransactions, irisGeojson, communeContour, onReady }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());

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

  const overlayLayers = useMemo<OverlayLayerConfig[]>(() => {
    const layers: OverlayLayerConfig[] = [];
    if (dvfTransactions?.length) {
      layers.push({ id: DVF_LAYER_ID, label: "Prix immobiliers (DVF)", color: "#eab308" });
    }
    if (irisGeojson) {
      layers.push({ id: IRIS_LAYER_ID, label: "Quartier IRIS", color: "#8b5cf6" });
    }
    return layers;
  }, [dvfTransactions, irisGeojson]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

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
            "fill-opacity": 0.12,
          },
        },
        {
          id: "cadastre-parcel-outline",
          type: "line",
          source: "cadastre-parcel",
          paint: {
            "line-color": "#0066cc",
            "line-width": 2.5,
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

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      preserveDrawingBuffer: true,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
          ...wmsSources,
          ...dvfSources,
          ...irisSources,
          ...communeSources,
          ...cadastreSources,
        },
        layers: [
          { id: "osm", type: "raster", source: "osm" },
          ...wmsLayers,
          ...dvfLayers,
          ...irisLayers,
          ...communeLayers,
          ...cadastreLayers, // cadastre on top of DVF
        ],
      },
      center: [lon, lat],
      zoom: cadastreParcel ? 17 : 14,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    onReadyRef.current?.(map.current);

    // Main marker — plus discret quand on affiche un contour de commune
    const markerColor = communeContour ? "#94a3b8" : "#0066cc";
    const markerScale = communeContour ? 0.55 : 1;
    new maplibregl.Marker({ color: markerColor, scale: markerScale })
      .setLngLat([lon, lat])
      .setPopup(new maplibregl.Popup().setText(label))
      .addTo(map.current);

    // Si on a le contour de la commune, ajuste le zoom à son emprise
    if (communeContour) {
      const bbox = computeBbox(communeContour);
      if (bbox) {
        map.current.fitBounds(bbox, { padding: 24, duration: 0 });
      }
    }

    // Add transport markers
    transports.forEach((transport) => {
      const markerColor = transport.type === "train" ? "#ff6b6b" : "#ffc107";
      const marker = new maplibregl.Marker({ color: markerColor });
      marker.setLngLat([transport.lon, transport.lat]);
      marker.setPopup(new maplibregl.Popup().setText(`${transport.type}: ${transport.name}`));
      marker.addTo(map.current!);
    });

    // DVF popup on click
    if (dvfTransactions?.length) {
      const m = map.current;
      m.on("click", `${DVF_LAYER_ID}-fill`, (e) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties;
        const html = `
          <strong>${Number(props.pricePerSqm).toLocaleString("fr-FR")} €/m²</strong><br/>
          Prix : ${Number(props.price).toLocaleString("fr-FR")} €<br/>
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
      }
    };
  }, [lat, lon, label, transports, cadastreParcel, dvfTransactions, irisGeojson, communeContour]);

  // Sync layer visibility
  useEffect(() => {
    if (!map.current) return;

    const m = map.current;
    const applyVisibility = () => {
      for (const layer of RISK_LAYERS) {
        const visibility = visibleLayers.has(layer.id) ? "visible" : "none";
        m.setLayoutProperty(layer.id, "visibility", visibility);
      }
      // DVF layers
      if (m.getLayer(`${DVF_LAYER_ID}-fill`)) {
        const dvfVisibility = visibleLayers.has(DVF_LAYER_ID) ? "visible" : "none";
        m.setLayoutProperty(`${DVF_LAYER_ID}-fill`, "visibility", dvfVisibility);
        m.setLayoutProperty(`${DVF_LAYER_ID}-outline`, "visibility", dvfVisibility);
      }
      // IRIS layers
      if (m.getLayer(`${IRIS_LAYER_ID}-fill`)) {
        const irisVisibility = visibleLayers.has(IRIS_LAYER_ID) ? "visible" : "none";
        m.setLayoutProperty(`${IRIS_LAYER_ID}-fill`, "visibility", irisVisibility);
        m.setLayoutProperty(`${IRIS_LAYER_ID}-outline`, "visibility", irisVisibility);
      }
    };

    if (m.isStyleLoaded()) {
      applyVisibility();
    } else {
      m.once("style.load", applyVisibility);
    }
  }, [visibleLayers]);

  return (
    <div className="map-wrapper">
      <div
        ref={mapContainer}
        className="map-container"
        style={{
          width: "100%",
          height: "400px",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      />
      <LayerTogglePanel
        riskLayers={RISK_LAYERS}
        priceLayers={overlayLayers}
        visibleLayers={visibleLayers}
        onToggle={handleToggle}
      />
    </div>
  );
}
