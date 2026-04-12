"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { RISK_LAYERS, buildWmsTileUrl } from "./riskLayers";
import { RiskLayerToggle } from "./RiskLayerToggle";
import type { CadastreParcelDto } from "@/types/location-analysis";

interface MapProps {
  lat: number;
  lon: number;
  label: string;
  transports?: Array<{ lat: number; lon: number; type: string; name: string }>;
  cadastreParcel?: CadastreParcelDto | null;
}

export function Map({ lat, lon, label, transports = [], cadastreParcel }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
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

    map.current = new maplibregl.Map({
      container: mapContainer.current,
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
          ...cadastreSources,
        },
        layers: [
          { id: "osm", type: "raster", source: "osm" },
          ...wmsLayers,
          ...cadastreLayers,
        ],
      },
      center: [lon, lat],
      zoom: 14,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Main marker for the searched address
    new maplibregl.Marker({ color: "#0066cc" })
      .setLngLat([lon, lat])
      .setPopup(new maplibregl.Popup().setText(label))
      .addTo(map.current);

    // Add transport markers
    transports.forEach((transport) => {
      const markerColor = transport.type === "train" ? "#ff6b6b" : "#ffc107";
      const marker = new maplibregl.Marker({ color: markerColor });
      marker.setLngLat([transport.lon, transport.lat]);
      marker.setPopup(new maplibregl.Popup().setText(`${transport.type}: ${transport.name}`));
      marker.addTo(map.current!);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [lat, lon, label, transports, cadastreParcel]);

  // Sync layer visibility
  useEffect(() => {
    if (!map.current) return;

    const m = map.current;
    const applyVisibility = () => {
      for (const layer of RISK_LAYERS) {
        const visibility = visibleLayers.has(layer.id) ? "visible" : "none";
        m.setLayoutProperty(layer.id, "visibility", visibility);
      }
    };

    if (m.isStyleLoaded()) {
      applyVisibility();
    } else {
      m.once("style.load", applyVisibility);
    }
  }, [visibleLayers]);

  return (
    <section className="map-section card">
      <h2>Localisation</h2>
      <p className="text-sm text-gray-600 mb-4">{label}</p>
      <div
        ref={mapContainer}
        className="map-container"
        style={{
          width: "100%",
          height: "400px",
          borderRadius: "8px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <RiskLayerToggle
          layers={RISK_LAYERS}
          visibleLayers={visibleLayers}
          onToggle={handleToggle}
        />
      </div>
    </section>
  );
}
