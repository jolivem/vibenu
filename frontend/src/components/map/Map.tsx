"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { RISK_LAYERS, buildWmsTileUrl } from "./riskLayers";
import { LayerTogglePanel } from "./RiskLayerToggle";
import type { OverlayLayerConfig } from "./RiskLayerToggle";
import type { CadastreParcelDto, DvfTransactionFeatureDto } from "@/types/location-analysis";

const DVF_LAYER_ID = "dvf-transactions";

interface MapProps {
  lat: number;
  lon: number;
  label: string;
  transports?: Array<{ lat: number; lon: number; type: string; name: string }>;
  cadastreParcel?: CadastreParcelDto | null;
  dvfTransactions?: DvfTransactionFeatureDto[];
}

export function Map({ lat, lon, label, transports = [], cadastreParcel, dvfTransactions }: MapProps) {
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

  const overlayLayers = useMemo<OverlayLayerConfig[]>(() => {
    if (!dvfTransactions?.length) return [];
    return [{ id: DVF_LAYER_ID, label: "Prix immobiliers (DVF)", color: "#eab308" }];
  }, [dvfTransactions]);

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
          ...dvfSources,
          ...cadastreSources,
        },
        layers: [
          { id: "osm", type: "raster", source: "osm" },
          ...wmsLayers,
          ...dvfLayers,
          ...cadastreLayers, // cadastre on top of DVF
        ],
      },
      center: [lon, lat],
      zoom: cadastreParcel ? 17 : 14,
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
  }, [lat, lon, label, transports, cadastreParcel, dvfTransactions]);

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
        <LayerTogglePanel
          riskLayers={RISK_LAYERS}
          priceLayers={overlayLayers}
          visibleLayers={visibleLayers}
          onToggle={handleToggle}
        />
      </div>
    </section>
  );
}
