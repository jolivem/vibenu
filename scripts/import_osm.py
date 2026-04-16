#!/usr/bin/env python3
"""
Import OpenStreetMap POI data for France into PostgreSQL/PostGIS.

Usage:
    python import_osm.py                          # downloads france-latest.osm.pbf
    python import_osm.py france-latest.osm.pbf    # uses local file

Environment:
    POSTGRES_URL - PostgreSQL connection string

Downloads the France OSM extract from Geofabrik, parses POIs matching
our 11 categories, and inserts into PostgreSQL with PostGIS geometries.
"""

import os
import sys
import osmium
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

GEOFABRIK_URL = "https://download.geofabrik.de/europe/france-latest.osm.pbf"
DEFAULT_PBF = "france-latest.osm.pbf"

# OSM tags → our category names
CATEGORY_MAP = {
    ("amenity", "school"): "school",
    ("amenity", "pharmacy"): "pharmacy",
    ("amenity", "doctors"): "doctor",
    ("amenity", "bank"): "bank",
    ("amenity", "post_office"): "post_office",
    ("amenity", "library"): "library",
    ("amenity", "restaurant"): "restaurant",
    ("shop", "supermarket"): "supermarket",
    ("shop", "bakery"): "bakery",
    ("leisure", "park"): "park",
    ("leisure", "sports_centre"): "sport",
}

BATCH_SIZE = 5000


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.")
        sys.exit(1)
    return psycopg2.connect(url)


def setup_database(conn):
    """Create PostGIS extension and osm_pois table."""
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cur.execute("DROP TABLE IF EXISTS osm_pois;")
        cur.execute("DROP TABLE IF EXISTS bpe_equipment;")  # cleanup old BPE table
        cur.execute("""
            CREATE TABLE osm_pois (
                id SERIAL PRIMARY KEY,
                osm_id BIGINT NOT NULL,
                name TEXT,
                category VARCHAR(20) NOT NULL,
                geom GEOMETRY(POINT, 4326) NOT NULL
            );
        """)
    conn.commit()
    print("Table osm_pois created.")


def resolve_category(tags):
    """Check if OSM tags match one of our categories."""
    for (key, value), category in CATEGORY_MAP.items():
        if tags.get(key) == value:
            return category
    return None


class PoiCollector(osmium.SimpleHandler):
    """Collect POI nodes and way centroids from OSM PBF."""

    def __init__(self):
        super().__init__()
        self.pois = []
        self.count = 0

    def node(self, n):
        if not n.location.valid():
            return
        category = resolve_category(n.tags)
        if category:
            name = n.tags.get("name", "")
            self.pois.append((n.id, name, category, n.location.lon, n.location.lat))
            self.count += 1
            if self.count % 50000 == 0:
                print(f"  ... {self.count} POIs collected")

    def way(self, w):
        category = resolve_category(w.tags)
        if not category:
            return
        # Calculate centroid from way nodes
        try:
            lons = []
            lats = []
            for node in w.nodes:
                if node.location.valid():
                    lons.append(node.location.lon)
                    lats.append(node.location.lat)
            if lons:
                centroid_lon = sum(lons) / len(lons)
                centroid_lat = sum(lats) / len(lats)
                name = w.tags.get("name", "")
                self.pois.append((w.id, name, category, centroid_lon, centroid_lat))
                self.count += 1
                if self.count % 50000 == 0:
                    print(f"  ... {self.count} POIs collected")
        except Exception:
            pass


def download_pbf(dest):
    """Download France PBF from Geofabrik."""
    import requests

    print(f"Downloading {GEOFABRIK_URL}...")
    print("  (this is ~4.2 GB, it may take a while)")

    response = requests.get(GEOFABRIK_URL, stream=True, timeout=30)
    response.raise_for_status()

    total = int(response.headers.get("content-length", 0))
    downloaded = 0

    with open(dest, "wb") as f:
        for chunk in response.iter_content(chunk_size=8 * 1024 * 1024):
            f.write(chunk)
            downloaded += len(chunk)
            if total > 0:
                pct = downloaded * 100 // total
                print(f"\r  {downloaded // (1024*1024)} MB / {total // (1024*1024)} MB ({pct}%)", end="", flush=True)

    print(f"\n  Downloaded to {dest}")


def insert_pois(conn, pois):
    """Insert POIs into database."""
    print(f"Inserting {len(pois)} POIs into database...")

    with conn.cursor() as cur:
        for i in range(0, len(pois), BATCH_SIZE):
            batch = pois[i:i + BATCH_SIZE]
            execute_values(
                cur,
                """
                INSERT INTO osm_pois (osm_id, name, category, geom)
                VALUES %s
                """,
                batch,
                template="(%s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))",
            )
            if (i // BATCH_SIZE) % 20 == 0:
                print(f"  ... {i + len(batch)}/{len(pois)} inserted")

    conn.commit()
    print(f"Inserted {len(pois)} POIs.")


def create_indexes(conn):
    """Create spatial and category indexes."""
    print("Creating indexes...")
    with conn.cursor() as cur:
        cur.execute("CREATE INDEX IF NOT EXISTS idx_osm_pois_geom ON osm_pois USING GIST (geom);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_osm_pois_category ON osm_pois (category);")
    conn.commit()
    print("Indexes created.")


def print_stats(conn):
    """Print category counts."""
    with conn.cursor() as cur:
        cur.execute("SELECT category, COUNT(*) FROM osm_pois GROUP BY category ORDER BY count DESC;")
        rows = cur.fetchall()
    print("\nPOI counts by category:")
    for category, count in rows:
        print(f"  {category}: {count:,}")
    total = sum(count for _, count in rows)
    print(f"  TOTAL: {total:,}")


def main():
    # Determine PBF file path
    if len(sys.argv) > 1:
        pbf_path = sys.argv[1]
    else:
        pbf_path = DEFAULT_PBF

    # Download if not exists
    if not os.path.exists(pbf_path):
        download_pbf(pbf_path)

    conn = get_connection()
    try:
        setup_database(conn)

        # Parse PBF
        print(f"Parsing {pbf_path}...")
        collector = PoiCollector()
        collector.apply_file(pbf_path, locations=True)
        print(f"Collected {collector.count} POIs.")

        # Insert
        insert_pois(conn, collector.pois)

        # Index
        create_indexes(conn)

        # Stats
        print_stats(conn)

        print("\nOSM import completed successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
