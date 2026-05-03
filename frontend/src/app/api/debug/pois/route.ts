import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server-shared/infrastructure/database/postgres";

// Debug endpoint: returns raw POIs from osm_pois + bpe_equipment for given coordinates,
// without dedup or per-category caps. Useful for diagnosing missing POIs.
//
// Example:
//   /api/debug/pois?lat=48.841103&lon=2.31372&radius=1000&category=school
//   /api/debug/pois?lat=48.841103&lon=2.31372&radius=1000&q=buffon
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const radius = Number(sp.get("radius") ?? "1000");
  const category = sp.get("category");
  const q = sp.get("q");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  const filters: string[] = [];
  const params: unknown[] = [lon, lat, radius];
  if (category) {
    params.push(category);
    filters.push(`category = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    filters.push(`name ILIKE $${params.length}`);
  }
  const whereExtra = filters.length > 0 ? ` AND ${filters.join(" AND ")}` : "";

  const rows = await query<{
    name: string | null;
    category: string;
    distance_meters: number;
    source: string;
    extra: string | null;
  }>(
    `(
       SELECT name, category,
              ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters,
              'osm' AS source,
              CAST(osm_id AS TEXT) AS extra
       FROM osm_pois
       WHERE ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)${whereExtra}
     )
     UNION ALL
     (
       SELECT name, category,
              ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters,
              'bpe' AS source,
              typequ AS extra
       FROM bpe_equipment
       WHERE ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)${whereExtra}
     )
     ORDER BY distance_meters ASC
     LIMIT 500`,
    params,
  );

  return NextResponse.json({
    count: rows.length,
    lat,
    lon,
    radius,
    rows,
  });
}
