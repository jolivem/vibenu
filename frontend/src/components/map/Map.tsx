"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapProps {
  lat: number;
  lon: number;
  label: string;
  transports?: Array<{ lat: number; lon: number; type: string; name: string }>;
  risks?: Array<{ lat: number; lon: number; type: string }>;
}

export function Map({ lat, lon, label, transports = [], risks = [] }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json", // Free OSM style
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

    // Add risk markers
    risks.forEach((risk) => {
      const marker = new maplibregl.Marker({ color: "#e74c3c" });
      marker.setLngLat([risk.lon, risk.lat]);
      marker.setPopup(new maplibregl.Popup().setText(`Risque: ${risk.type}`));
      marker.addTo(map.current!);
    });

    return () => {
      // Cleanup
      if (map.current) {
        map.current.remove();
      }
    };
  }, [lat, lon, label, transports, risks]);

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
        }}
      />
    </section>
  );
}
