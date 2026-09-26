import { NextRequest, NextResponse } from "next/server";
import { GpuFloodZoneProvider } from "@/server-modules/risks/infrastructure/gpu-flood-zone.provider";
import type { FloodWindow } from "@/server-modules/risks/domain/risk.types";

const METERS_PER_DEGREE_LAT = 111_320;

/**
 * Sonde des zonages PPR d'inondation, sans passer par l'analyse complète.
 *
 * Le pipeline enchaîne deux services externes, une jointure d'aléa et une simplification
 * géométrique : le vérifier à travers `/analyze` mêlerait ses erreurs à celles de quinze
 * autres sources. Ici, une adresse, un rayon, et on voit ce qui sort — nom des plans,
 * nombre de sommets, poids.
 *
 * Exemples :
 *   /api/debug/flood-zones?lat=48.7997&lon=2.0705   (Saint-Cyr-l'École : ru de Gally, Bièvre)
 *   /api/debug/flood-zones?lat=44.2405&lon=5.0724   (Vaison : 17 zones, aucune nommée « inondation »)
 *   /api/debug/flood-zones?lat=45.0&lon=2.7         (Cantal rural : aucune)
 *   /api/debug/flood-zones?lat=44.84&lon=-0.58      (Bordeaux : le pire cas de poids)
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const radius = Number(sp.get("radius") ?? "6000");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  const dLat = radius / METERS_PER_DEGREE_LAT;
  const dLon = radius / (METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
  const window: FloodWindow = [lon - dLon, lat - dLat, lon + dLon, lat + dLat];

  const startedAt = Date.now();
  const zones = await new GpuFloodZoneProvider().getFloodZones(window);
  const elapsedMs = Date.now() - startedAt;

  const countPoints = (zone: (typeof zones)[number]): number => {
    let n = 0;
    const visit = (coords: unknown): void => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === "number") {
        n += 1;
        return;
      }
      for (const c of coords) visit(c);
    };
    visit(zone.geometry.coordinates);
    return n;
  };

  return NextResponse.json({
    lat,
    lon,
    radius,
    window,
    elapsedMs,
    count: zones.length,
    totalPoints: zones.reduce((sum, z) => sum + countPoints(z), 0),
    jsonKb: Math.round(JSON.stringify(zones).length / 1024),
    zones: zones.map((z) => ({ label: z.label, points: countPoints(z) })),
  });
}
