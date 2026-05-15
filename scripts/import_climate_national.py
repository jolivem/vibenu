#!/usr/bin/env python3
"""
Pré-calcule les normales climatiques 1991-2020 (France métropolitaine) en
agrégant les données Open-Meteo Archive sur N villes représentatives, puis
insère le résultat dans la table climate_national_normales.

IDEMPOTENT : chaque ville réussie est stockée dans climate_city_normales.
Si le script est interrompu (429, timeout, etc.), un nouveau run :
  - saute les villes déjà en base
  - ne tente l'API que pour les villes manquantes
  - met à jour la moyenne FR si le seuil min de villes est atteint

Avantages vs le runtime :
  - Backoff exponentiel généreux sur les 429 (jusqu'à 5 retries)
  - Délais longs entre requêtes (configurable)
  - Indépendant du dev server : on ne bloque pas l'app
  - Cohérence méthodologique avec les valeurs locales (même API/algo)

Usage :
    python import_climate_national.py
    python import_climate_national.py --delay 10 --max-retries 8
    python import_climate_national.py --force-refresh  # ignore le cache, retout fetch

Pré-requis : migrations 006 et 007 appliquées.
"""

import argparse
import os
import sys
import time
import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv()

# Mêmes villes que dans le provider TS → cohérence
SAMPLE_CITIES = [
    (48.85, 2.35, "Paris"),
    (43.30, 5.40, "Marseille"),
    (45.75, 4.83, "Lyon"),
    (43.60, 1.43, "Toulouse"),
    (43.70, 7.27, "Nice"),
    (47.22, -1.55, "Nantes"),
    (48.58, 7.75, "Strasbourg"),
    (50.63, 3.06, "Lille"),
    (44.84, -0.58, "Bordeaux"),
    (48.39, -4.49, "Brest"),
    (45.78, 3.08, "Clermont-Ferrand"),
    (49.26, 4.03, "Reims"),
]

PERIOD_START = 1991
PERIOD_END = 2020
BASE_URL = "https://archive-api.open-meteo.com/v1/archive"
MIN_VALID = 6


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def load_existing_cities(conn):
    """Renvoie {city_name: {temperature_c, precipitation_mm, sunshine_hours}}."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT city_name, temperature_c, precipitation_mm, sunshine_hours
            FROM climate_city_normales
            WHERE period_start = %s AND period_end = %s
        """, (PERIOD_START, PERIOD_END))
        rows = cur.fetchall()
    return {
        name: {
            "temperature_c": float(t),
            "precipitation_mm": int(p),
            "sunshine_hours": int(s),
        }
        for (name, t, p, s) in rows
    }


def save_city(conn, name, lat, lon, normales):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO climate_city_normales
              (city_name, lat, lon, period_start, period_end,
               temperature_c, precipitation_mm, sunshine_hours, fetched_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (city_name) DO UPDATE SET
              lat = EXCLUDED.lat,
              lon = EXCLUDED.lon,
              period_start = EXCLUDED.period_start,
              period_end = EXCLUDED.period_end,
              temperature_c = EXCLUDED.temperature_c,
              precipitation_mm = EXCLUDED.precipitation_mm,
              sunshine_hours = EXCLUDED.sunshine_hours,
              fetched_at = NOW();
            """,
            (name, lat, lon, PERIOD_START, PERIOD_END,
             normales["temperature_c"], normales["precipitation_mm"], normales["sunshine_hours"]),
        )
    conn.commit()


def fetch_normales(lat, lon, name, max_retries=5, base_delay=10):
    """Récupère les normales 1991-2020 pour un point, avec backoff exp. sur 429."""
    url = (
        f"{BASE_URL}?latitude={lat:.2f}&longitude={lon:.2f}"
        f"&start_date={PERIOD_START}-01-01&end_date={PERIOD_END}-12-31"
        f"&daily=temperature_2m_mean,precipitation_sum,sunshine_duration"
        f"&timezone=Europe%2FParis"
    )

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(url, timeout=60)
            if resp.status_code == 429:
                wait = base_delay * (2 ** (attempt - 1))
                print(f"  [{name}] 429 (attempt {attempt}/{max_retries}) — backoff {wait}s")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            daily = data.get("daily", {})
            times = daily.get("time") or []
            temps = daily.get("temperature_2m_mean") or []
            precip = daily.get("precipitation_sum") or []
            sunshine = daily.get("sunshine_duration") or []
            n = len(times)
            if n == 0:
                print(f"  [{name}] empty daily data")
                return None
            years = PERIOD_END - PERIOD_START + 1
            t_vals = [v for v in temps if v is not None]
            p_total = sum(v for v in precip if v is not None)
            s_total = sum(v for v in sunshine if v is not None)
            return {
                "temperature_c": round(sum(t_vals) / max(1, len(t_vals)), 1),
                "precipitation_mm": round(p_total / years),
                "sunshine_hours": round(s_total / 3600 / years),
            }
        except requests.RequestException as e:
            wait = base_delay * (2 ** (attempt - 1))
            print(f"  [{name}] error (attempt {attempt}/{max_retries}) {e} — backoff {wait}s")
            time.sleep(wait)
    print(f"  [{name}] FAILED after {max_retries} attempts")
    return None


def upsert_national(conn, normales, source, sample_count):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO climate_national_normales
              (scope, period_start, period_end, temperature_c, precipitation_mm,
               sunshine_hours, source, sample_count, computed_at)
            VALUES ('FR', %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (scope) DO UPDATE SET
              period_start = EXCLUDED.period_start,
              period_end = EXCLUDED.period_end,
              temperature_c = EXCLUDED.temperature_c,
              precipitation_mm = EXCLUDED.precipitation_mm,
              sunshine_hours = EXCLUDED.sunshine_hours,
              source = EXCLUDED.source,
              sample_count = EXCLUDED.sample_count,
              computed_at = NOW();
            """,
            (
                PERIOD_START, PERIOD_END,
                normales["temperature_c"], normales["precipitation_mm"], normales["sunshine_hours"],
                source, sample_count,
            ),
        )
    conn.commit()


def main():
    parser = argparse.ArgumentParser(description="Pré-calcule les normales climatiques nationales.")
    parser.add_argument("--delay", type=float, default=5.0, help="Délai entre requêtes (s, def. 5)")
    parser.add_argument("--max-retries", type=int, default=5, help="Tentatives max par ville (def. 5)")
    parser.add_argument("--base-delay", type=int, default=10, help="Délai initial du backoff (s, def. 10)")
    parser.add_argument("--force-refresh", action="store_true",
                        help="Ignore le cache et re-télécharge toutes les villes")
    args = parser.parse_args()

    print(f"=== Climate national normales {PERIOD_START}-{PERIOD_END} ===")

    conn = get_connection()
    try:
        existing = {} if args.force_refresh else load_existing_cities(conn)
        to_fetch = [c for c in SAMPLE_CITIES if c[2] not in existing]
        already = [c for c in SAMPLE_CITIES if c[2] in existing]

        if already:
            print(f"Already cached ({len(already)}): {', '.join(c[2] for c in already)}")
        print(f"To fetch  ({len(to_fetch)}): {', '.join(c[2] for c in to_fetch) or '(none)'}")
        print(f"Sample target: {len(SAMPLE_CITIES)} cities · min seuil: {MIN_VALID} · "
              f"delay {args.delay}s · backoff base {args.base_delay}s · max retries {args.max_retries}")

        results = dict(existing)  # name → normales

        for i, (lat, lon, name) in enumerate(to_fetch):
            print(f"[{i+1}/{len(to_fetch)}] {name} ({lat:.2f}, {lon:.2f}) ...")
            r = fetch_normales(lat, lon, name, args.max_retries, args.base_delay)
            if r:
                print(f"  ✓ T {r['temperature_c']}°C · P {r['precipitation_mm']} mm/an · S {r['sunshine_hours']} h/an")
                save_city(conn, name, lat, lon, r)
                results[name] = r
            else:
                print(f"  ✗ {name} : pas de donnée (sera retenté au prochain run)")
            if i < len(to_fetch) - 1:
                time.sleep(args.delay)

        # Agrégation à partir de tout ce qu'on a (cached + fresh)
        all_values = list(results.values())
        print(f"\n=== Aggregate (n={len(all_values)}/{len(SAMPLE_CITIES)}) ===")

        if len(all_values) < MIN_VALID:
            print(f"⚠  Seulement {len(all_values)} villes en base, seuil minimum = {MIN_VALID}.")
            print(f"   Relancer le script plus tard pour compléter les villes manquantes.")
            print(f"   Tables : climate_city_normales contient les villes déjà récupérées.")
            sys.exit(2)

        avg = {
            "temperature_c": round(sum(r["temperature_c"] for r in all_values) / len(all_values), 1),
            "precipitation_mm": round(sum(r["precipitation_mm"] for r in all_values) / len(all_values)),
            "sunshine_hours": round(sum(r["sunshine_hours"] for r in all_values) / len(all_values)),
        }
        print(f"  Température moyenne : {avg['temperature_c']} °C")
        print(f"  Précipitations      : {avg['precipitation_mm']} mm/an")
        print(f"  Ensoleillement      : {avg['sunshine_hours']} h/an")

        upsert_national(conn, avg, f"open-meteo-{len(SAMPLE_CITIES)}-cities", len(all_values))
        print("\n✓ Saved to climate_national_normales (scope='FR').")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
