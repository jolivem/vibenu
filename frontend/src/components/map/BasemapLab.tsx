"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect } from "react";
import { BASEMAPS, IGN_PARCELLAIRE_TILES, type BasemapOption } from "./basemaps";
import { RISK_LAYERS, buildWmsTileUrl } from "./riskLayers";

/* ------------------------------------------------------------------ */
/* Lieux de test                                                       */
/* ------------------------------------------------------------------ */

interface Place {
  label: string;
  lat: number;
  lon: number;
  zoom: number;
  hint: string;
}

const PLACES: Place[] = [
  { label: "Paris — Le Marais", lat: 48.8592, lon: 2.3626, zoom: 16, hint: "tissu urbain dense, beaucoup de toponymes" },
  { label: "Lyon — Part-Dieu", lat: 45.7605, lon: 4.8573, zoom: 15, hint: "gros équipements, voies ferrées" },
  { label: "Marseille — Vieux-Port", lat: 43.2951, lon: 5.3739, zoom: 15, hint: "littoral, relief" },
  { label: "Arles — bord du Rhône", lat: 43.6768, lon: 4.6277, zoom: 14, hint: "zone inondable — teste le WMS PPR" },
  { label: "Vallée de la Roya", lat: 43.9846, lon: 7.5546, zoom: 13, hint: "montagne, aléa sismique" },
  { label: "Commune rurale (Creuse)", lat: 46.1667, lon: 2.0, zoom: 13, hint: "faible densité, peu de données" },
];

/* ------------------------------------------------------------------ */
/* Couches de test                                                     */
/* ------------------------------------------------------------------ */

const DVF_SOURCE = "lab-dvf";
const DVF_FILL = "lab-dvf-fill";
const DVF_LINE = "lab-dvf-line";
const PARCEL_SOURCE = "lab-parcel";
const PARCEL_FILL = "lab-parcel-fill";
const PARCEL_LINE = "lab-parcel-line";
const CADASTRE_LAYER = "lab-ign-parcellaire";

/** Générateur déterministe : les mêmes polygones sur tous les fonds comparés. */
function makeSeededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Parcelles DVF simulées autour du centre, colorées avec l'échelle exacte
 * de la carte de production (2 000 → vert, 5 000 → jaune, 10 000 → rouge).
 * Simulées et non réelles : l'objet du bac à sable est de juger la lisibilité
 * du fond sous des aplats colorés, pas l'exactitude des prix.
 */
function buildFakeDvf(lat: number, lon: number) {
  const rand = makeSeededRandom(42);
  const features = [];
  for (let i = 0; i < 90; i++) {
    const dLat = (rand() - 0.5) * 0.014;
    const dLon = (rand() - 0.5) * 0.026;
    const size = 0.00035 + rand() * 0.0006;
    const cLat = lat + dLat;
    const cLon = lon + dLon;
    features.push({
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [cLon - size, cLat - size * 0.62],
            [cLon + size, cLat - size * 0.62],
            [cLon + size, cLat + size * 0.62],
            [cLon - size, cLat + size * 0.62],
            [cLon - size, cLat - size * 0.62],
          ],
        ],
      },
      properties: { pricePerSqm: Math.round(1500 + rand() * 9500) },
    });
  }
  return { type: "FeatureCollection" as const, features };
}

function buildFakeParcel(lat: number, lon: number) {
  const s = 0.0006;
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [
            [
              [lon - s, lat - s * 0.62],
              [lon + s * 0.7, lat - s * 0.62],
              [lon + s, lat + s * 0.4],
              [lon - s * 0.5, lat + s * 0.62],
              [lon - s, lat - s * 0.62],
            ],
          ],
        },
        properties: {},
      },
    ],
  };
}

interface Overlays {
  dvf: boolean;
  parcel: boolean;
  /** Parcellaire cadastral IGN — vrai calque transparent, pose sur n'importe quel fond. */
  cadastre: boolean;
  risks: Set<string>;
  opacity: number;
}

/* ------------------------------------------------------------------ */
/* Une carte du comparateur                                            */
/* ------------------------------------------------------------------ */

interface LabMapProps {
  basemap: BasemapOption;
  place: Place;
  overlays: Overlays;
  height: number;
  register: (id: string, map: MapLibreMap) => void;
  unregister: (id: string) => void;
}

function LabMap({ basemap, place, overlays, height, register, unregister }: LabMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init — dépend du style et du lieu uniquement. Changer de fond = remonter la carte.
  useEffect(() => {
    if (!container.current) return;

    const map = new maplibregl.Map({
      container: container.current,
      style: basemap.style,
      center: [place.lon, place.lat],
      zoom: place.zoom,
      attributionControl: { compact: true },
      preserveDrawingBuffer: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("error", (e) => {
      // Les WMS BRGM renvoient parfois des tuiles vides : on n'affiche que les
      // erreurs de style/source, pas le bruit de tuiles manquantes.
      const msg = (e.error as Error | undefined)?.message ?? "";
      if (msg && !msg.includes("Failed to fetch") && !msg.toLowerCase().includes("tile")) {
        setError(msg);
      }
    });

    map.on("load", () => {
      setReady(true);
      register(basemap.id, map);
    });

    return () => {
      unregister(basemap.id);
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // place/basemap changent => on remonte volontairement la carte
  }, [basemap, place, register, unregister]);

  // Overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    /* --- DVF simulé --- */
    if (overlays.dvf && !map.getSource(DVF_SOURCE)) {
      map.addSource(DVF_SOURCE, { type: "geojson", data: buildFakeDvf(place.lat, place.lon) });
      map.addLayer({
        id: DVF_FILL,
        type: "fill",
        source: DVF_SOURCE,
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "pricePerSqm"],
            2000, "#22c55e",
            5000, "#eab308",
            10000, "#ef4444",
          ],
          "fill-opacity": overlays.opacity,
        },
      });
      map.addLayer({
        id: DVF_LINE,
        type: "line",
        source: DVF_SOURCE,
        paint: { "line-color": "#374151", "line-width": 0.5 },
      });
    } else if (!overlays.dvf && map.getSource(DVF_SOURCE)) {
      if (map.getLayer(DVF_LINE)) map.removeLayer(DVF_LINE);
      if (map.getLayer(DVF_FILL)) map.removeLayer(DVF_FILL);
      map.removeSource(DVF_SOURCE);
    } else if (overlays.dvf && map.getLayer(DVF_FILL)) {
      map.setPaintProperty(DVF_FILL, "fill-opacity", overlays.opacity);
    }

    /* --- Parcelle cadastrale simulée --- */
    if (overlays.parcel && !map.getSource(PARCEL_SOURCE)) {
      map.addSource(PARCEL_SOURCE, { type: "geojson", data: buildFakeParcel(place.lat, place.lon) });
      map.addLayer({
        id: PARCEL_FILL,
        type: "fill",
        source: PARCEL_SOURCE,
        paint: { "fill-color": "#0066cc", "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: PARCEL_LINE,
        type: "line",
        source: PARCEL_SOURCE,
        paint: { "line-color": "#0066cc", "line-width": 2 },
      });
    } else if (!overlays.parcel && map.getSource(PARCEL_SOURCE)) {
      if (map.getLayer(PARCEL_LINE)) map.removeLayer(PARCEL_LINE);
      if (map.getLayer(PARCEL_FILL)) map.removeLayer(PARCEL_FILL);
      map.removeSource(PARCEL_SOURCE);
    }

    /* --- Parcellaire cadastral IGN (vrai calque, transparent) --- */
    if (overlays.cadastre && !map.getSource(CADASTRE_LAYER)) {
      map.addSource(CADASTRE_LAYER, {
        type: "raster",
        tiles: [IGN_PARCELLAIRE_TILES],
        tileSize: 256,
      });
      map.addLayer({
        id: CADASTRE_LAYER,
        type: "raster",
        source: CADASTRE_LAYER,
        paint: { "raster-opacity": overlays.opacity },
      });
    } else if (!overlays.cadastre && map.getSource(CADASTRE_LAYER)) {
      if (map.getLayer(CADASTRE_LAYER)) map.removeLayer(CADASTRE_LAYER);
      map.removeSource(CADASTRE_LAYER);
    } else if (overlays.cadastre && map.getLayer(CADASTRE_LAYER)) {
      map.setPaintProperty(CADASTRE_LAYER, "raster-opacity", overlays.opacity);
    }

    /* --- WMS risques (les vrais services BRGM / Géorisques) --- */
    for (const layer of RISK_LAYERS) {
      const on = overlays.risks.has(layer.id);
      const exists = Boolean(map.getSource(layer.id));
      if (on && !exists) {
        map.addSource(layer.id, {
          type: "raster",
          tiles: [buildWmsTileUrl(layer)],
          tileSize: 256,
        });
        map.addLayer({
          id: layer.id,
          type: "raster",
          source: layer.id,
          paint: { "raster-opacity": overlays.opacity },
        });
      } else if (!on && exists) {
        if (map.getLayer(layer.id)) map.removeLayer(layer.id);
        map.removeSource(layer.id);
      } else if (on && map.getLayer(layer.id)) {
        map.setPaintProperty(layer.id, "raster-opacity", overlays.opacity);
      }
    }
  }, [ready, overlays, place]);

  return (
    <div className="lab-card">
      <div className="lab-card-head">
        <strong>{basemap.label}</strong>
        <span className={basemap.vector ? "lab-tag lab-tag-vector" : "lab-tag"}>
          {basemap.vector ? "vectoriel" : "raster"}
        </span>
      </div>
      <div ref={container} style={{ height }} className="lab-canvas" />
      <p className="lab-note">{basemap.note}</p>
      {error && <p className="lab-error">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Comparateur                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_SELECTION = ["osm", "ign-standard", "ign-gris", "ign-sans-toponymes"];

export function BasemapLab() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [dvf, setDvf] = useState(false);
  const [parcel, setParcel] = useState(false);
  const [cadastre, setCadastre] = useState(false);
  const [risks, setRisks] = useState<Set<string>>(new Set());
  const [opacity, setOpacity] = useState(0.6);
  const [height, setHeight] = useState(360);

  const place = PLACES[placeIndex];

  /* --- Synchronisation des vues, en impératif pour ne pas re-rendre au pan --- */
  const mapsRef = useRef(new globalThis.Map<string, MapLibreMap>());
  const syncing = useRef(false);

  const register = useCallback((id: string, map: MapLibreMap) => {
    mapsRef.current.set(id, map);
    map.on("move", () => {
      if (syncing.current) return;
      syncing.current = true;
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      for (const [otherId, other] of mapsRef.current) {
        if (otherId === id) continue;
        other.jumpTo({ center, zoom, bearing, pitch });
      }
      syncing.current = false;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    mapsRef.current.delete(id);
  }, []);

  const overlays: Overlays = useMemo(
    () => ({ dvf, parcel, cadastre, risks, opacity }),
    [dvf, parcel, cadastre, risks, opacity],
  );

  const toggleBasemap = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleRisk = (id: string) =>
    setRisks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const shown = BASEMAPS.filter((b) => selected.includes(b.id));

  return (
    <div className="lab">
      <header className="lab-header">
        <h1>Comparateur de fonds de carte</h1>
        <p>
          Bac à sable V2. Les fonds IGN proviennent de la Géoplateforme (cartes.gouv.fr), sans clé API.
          Les cartes sont synchronisées : déplace l&apos;une, les autres suivent.
        </p>
      </header>

      <div className="lab-controls">
        <fieldset>
          <legend>Fonds comparés</legend>
          <div className="lab-chips">
            {BASEMAPS.map((b) => (
              <label key={b.id} className={selected.includes(b.id) ? "lab-chip lab-chip-on" : "lab-chip"}>
                <input
                  type="checkbox"
                  checked={selected.includes(b.id)}
                  onChange={() => toggleBasemap(b.id)}
                />
                {b.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Lieu</legend>
          <select value={placeIndex} onChange={(e) => setPlaceIndex(Number(e.target.value))}>
            {PLACES.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label} — {p.hint}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset>
          <legend>Couches par-dessus</legend>
          <div className="lab-chips">
            <label className={dvf ? "lab-chip lab-chip-on" : "lab-chip"}>
              <input type="checkbox" checked={dvf} onChange={() => setDvf((v) => !v)} />
              Prix DVF (simulés)
            </label>
            <label className={parcel ? "lab-chip lab-chip-on" : "lab-chip"}>
              <input type="checkbox" checked={parcel} onChange={() => setParcel((v) => !v)} />
              Parcelle (simulée)
            </label>
            <label className={cadastre ? "lab-chip lab-chip-on" : "lab-chip"}>
              <input type="checkbox" checked={cadastre} onChange={() => setCadastre((v) => !v)} />
              Parcellaire IGN (vrai calque)
            </label>
            {RISK_LAYERS.map((l) => (
              <label key={l.id} className={risks.has(l.id) ? "lab-chip lab-chip-on" : "lab-chip"}>
                <input type="checkbox" checked={risks.has(l.id)} onChange={() => toggleRisk(l.id)} />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Réglages</legend>
          <label className="lab-range">
            Opacité des couches : {Math.round(opacity * 100)} %
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </label>
          <label className="lab-range">
            Hauteur : {height} px
            <input
              type="range"
              min={240}
              max={640}
              step={20}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>
        </fieldset>
      </div>

      <div className="lab-grid">
        {shown.map((b) => (
          <LabMap
            key={`${b.id}-${placeIndex}`}
            basemap={b}
            place={place}
            overlays={overlays}
            height={height}
            register={register}
            unregister={unregister}
          />
        ))}
      </div>

      {shown.length === 0 && <p className="lab-empty">Sélectionne au moins un fond de carte.</p>}
    </div>
  );
}
