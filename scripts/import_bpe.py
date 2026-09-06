#!/usr/bin/env python3
"""
Import BPE (Base Permanente des Équipements) data from INSEE into PostgreSQL.

Usage:
    python import_bpe.py

Environment:
    POSTGRES_URL - PostgreSQL connection string

Downloads the latest BPE data from INSEE, filters relevant equipment types,
and inserts into PostgreSQL. The 2024 BPE file includes LONGITUDE/LATITUDE
in WGS84 and establishment names (NOMRS).
"""

import os
import sys
import io
import zipfile
import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

# INSEE BPE download URL (géolocalisé, millésime 2025)
BPE_URL = "https://www.insee.fr/fr/statistiques/fichier/8217525/BPE25.zip"

# BPE TYPEQU → catégorie applicative.
#
# ⚠️ Les codes ne sont PAS devinables, et une erreur ici est silencieuse : la table se
# remplit, les cards s'affichent, et elles montrent autre chose que ce qu'annonce leur
# libellé. La version précédente de cette table était fausse sur une quinzaine de codes —
# les hôpitaux comptés comme « médecins », les gendarmeries comme « banques », les
# cinémas comme « bibliothèques », les aéroports comme « gares » — parce qu'elle avait
# été écrite contre une nomenclature qui n'était pas celle du fichier téléchargé.
#
# Les commentaires ci-dessous sont les libellés officiels, recopiés depuis
# https://www.insee.fr/fr/metadonnees/source/fichier/TYPEQU_2025.csv (235 types).
# La nomenclature est révisée chaque année : à chaque changement de millésime, rejouer
# la vérification plutôt que de supposer la stabilité des codes.
#
# Deux catégories n'ont volontairement aucun code : `park` et `metro_station`. La BPE
# 2025 ne recense ni espaces verts ni stations de métro — les premiers viennent d'OSM
# (`osm_pois`), les secondes du module mobilité (GTFS). Mieux vaut l'absence assumée
# qu'un code approchant qui remplirait la catégorie avec autre chose.
#
# Re-lancer `python import_bpe.py` après modification pour recharger la table.

TYPEQU_MAPPING = {
    # --- éducation & petite enfance ---
    "D502": "preschool",         # ÉTABLISSEMENT D’ACCUEIL DU JEUNE ENFANT
    "D509": "preschool",         # MICRO-CRECHE
    "C107": "school",            # ÉCOLE MATERNELLE
    "C108": "school",            # ÉCOLE PRIMAIRE
    "C109": "school",            # ÉCOLE ÉLÉMENTAIRE
    "C201": "school",            # COLLÈGE
    "C301": "school",            # LYCÉE D’ENSEIGNEMENT GÉNÉRAL ET/OU TECHNOLOGIQUE
    "C302": "school",            # LYCÉE D’ENSEIGNEMENT PROFESSIONNEL
    "C303": "school",            # LYCÉE D’ENSEIGNEMENT TECHNIQUE ET/OU PROFESSIONNEL AGRICOLE
    "C401": "higher_ed",         # STS SECTION TECHNICIEN SUPÉRIEUR, CPGE CLASSE PRÉPARATOIRE AUX GRANDES ÉCOLES
    "C501": "higher_ed",         # UFR
    "C502": "higher_ed",         # INSTITUT UNIVERSITAIRE
    "C503": "higher_ed",         # ÉCOLE D’INGÉNIEURS
    "C504": "higher_ed",         # ENSEIGNEMENT GÉNÉRAL SUPÉRIEUR PRIVÉ
    "C509": "higher_ed",         # AUTRE ENSEIGNEMENT SUPÉRIEUR
    # --- alimentaire ---
    "B104": "supermarket",       # HYPERMARCHÉ ET GRAND MAGASIN
    "B105": "supermarket",       # SUPERMARCHÉ ET MAGASIN MULTI-COMMERCE
    "B201": "supermarket",       # SUPÉRETTE
    "B202": "grocery",           # ÉPICERIE
    "B208": "grocery",           # COMMERCE SPÉCIALISÉ EN FRUITS ET LÉGUMES
    "B204": "butcher",           # BOUCHERIE CHARCUTERIE
    "B205": "frozen_food",       # PRODUITS SURGELÉS
    "B206": "fish_shop",         # POISSONNERIE
    "B207": "bakery",            # BOULANGERIE-PÂTISSERIE
    # --- restauration ---
    "A504": "restaurant",        # RESTAURANT- RESTAURATION RAPIDE
    # --- commerce non alimentaire ---
    "B302": "clothing",          # MAGASIN DE VÊTEMENTS
    "B303": "home_goods",        # MAGASIN D’ÉQUIPEMENTS DU FOYER
    "B304": "shoes",             # MAGASIN DE CHAUSSURES
    "B312": "florist",           # FLEURISTE-JARDINERIE-ANIMALERIE
    "B316": "gas_station",       # STATION-SERVICE
    "B324": "bookstore",         # LIBRAIRIE
    # --- santé — établissements ---
    "D101": "hospital",          # ÉTABLISSEMENT DE SOINS DE COURTE DURÉE
    "D106": "emergency",         # URGENCES
    "D108": "clinic",            # CENTRE DE SANTÉ
    "D113": "clinic",            # MAISON DE SANTÉ PLURIDISCIPLINAIRE
    "D302": "lab",               # LABORATOIRE D ANALYSES ET DE BIOLOGIE MÉDICALE
    "D307": "pharmacy",          # PHARMACIE
    # --- santé — professionnels libéraux ---
    "D265": "doctor",            # MÉDECIN GÉNÉRALISTE
    "D266": "specialist",        # SPÉCIALISTE EN CARDIOLOGIE
    "D267": "specialist",        # SPÉCIALISTE EN DERMATOLOGIE VÉNÉRÉOLOGIE
    "D268": "specialist",        # SPÉCIALISTE EN GASTRO-ENTÉROLOGIE HÉPATOLOGIE
    "D269": "specialist",        # SPÉCIALISTE EN PSYCHIATRIE
    "D270": "specialist",        # SPÉCIALISTE EN OPHTALMOLOGIE
    "D271": "specialist",        # SPÉCIALISTE EN OTO-RHINO-LARYNGOLOGIE
    "D272": "specialist",        # SPÉCIALISTE EN PÉDIATRIE
    "D273": "specialist",        # SPÉCIALISTE EN PNEUMOLOGIE
    "D274": "specialist",        # SPÉCIALISTE EN RADIODIAGNOSTIC ET IMAGERIE MÉDICALE
    "D276": "specialist",        # SPÉCIALISTE EN GYNÉCOLOGIE MÉDICALE ET/OU OBSTÉTRIQUE
    "D277": "dentist",           # CHIRURGIEN DENTISTE
    "D281": "nurse",             # INFIRMIER
    "D279": "physio",            # MASSEUR KINÉSITHÉRAPEUTE
    "D282": "speech_therapist",  # ORTHOPHONISTE
    "D280": "podiatrist",        # PÉDICURE-PODOLOGUE
    "B313": "optician",          # MAGASIN D’OPTIQUE
    "D250": "psychologist",      # PSYCHOLOGUE
    # --- services publics ---
    "A140": "police",            # POLICE
    "A104": "police",            # GENDARMERIE
    "A203": "bank",              # BANQUE, CAISSE D’ÉPARGNE
    "A206": "post_office",       # BUREAU DE POSTE
    "A207": "post_office",       # RELAIS POSTE
    "A208": "post_office",       # AGENCE POSTALE
    "A129": "town_hall",         # MAIRIE
    # --- culture ---
    "F307": "library",           # BIBLIOTHÈQUE
    "F303": "cinema",            # CINÉMA
    "F312": "museum",            # EXPOSITION ET MÉDIATION CULTURELLE
    "F315": "theatre",           # ARTS DU SPECTACLE
    "F305": "concert_hall",      # CONSERVATOIRE
    # --- sport ---
    "F101": "sport",             # BASSIN DE NATATION
    "F102": "sport",             # BOULODROME
    "F103": "sport",             # TENNIS
    "F106": "sport",             # CENTRE ÉQUESTRE
    "F107": "sport",             # ATHLÉTISME
    "F108": "sport",             # TERRAIN DE GOLF
    "F109": "sport",             # PARCOURS SPORTIF/SANTÉ
    "F111": "sport",             # PLATEAUX ET TERRAINS DE JEUX EXTÉRIEURS
    "F113": "sport",             # TERRAINS DE GRANDS JEUX
    "F116": "sport",             # SALLES NON SPÉCIALISÉES
    "F120": "sport",             # SALLES DE REMISE EN FORME
    "F121": "sport",             # SALLES MULTISPORTS, GYMNASES
    # --- transports ---
    "E107": "rail_station",      # GARE DE VOYAGEURS D’INTÉRÊT NATIONAL
    "E108": "rail_station",      # GARE DE VOYAGEURS D’INTÉRÊT RÉGIONAL
    "E109": "rail_station",      # GARE DE VOYAGEURS D’INTÉRÊT LOCAL
}

BATCH_SIZE = 1000


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.")
        sys.exit(1)
    return psycopg2.connect(url)


def setup_database(conn):
    """Create PostGIS extension and bpe_equipment table."""
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cur.execute("DROP TABLE IF EXISTS bpe_equipment;")
        cur.execute("""
            CREATE TABLE bpe_equipment (
                id SERIAL PRIMARY KEY,
                depcom VARCHAR(5) NOT NULL,
                typequ VARCHAR(4) NOT NULL,
                category VARCHAR(20) NOT NULL,
                name TEXT,
                geom GEOMETRY(POINT, 4326) NOT NULL
            );
        """)
    conn.commit()
    print("Table bpe_equipment created.")


def download_bpe():
    """Download and extract BPE CSV from INSEE."""
    print(f"Downloading BPE from {BPE_URL}...")
    response = requests.get(BPE_URL, timeout=300)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        csv_files = [f for f in zf.namelist() if f.endswith(".csv")]
        if not csv_files:
            print("Error: No CSV file found in ZIP archive.")
            sys.exit(1)

        csv_name = csv_files[0]
        print(f"Extracting {csv_name}...")
        with zf.open(csv_name) as f:
            df = pd.read_csv(f, sep=";", dtype=str, low_memory=False)

    print(f"Loaded {len(df)} rows from BPE.")
    return df


def process_and_insert(conn, df):
    """Filter, and insert into database."""
    df.columns = df.columns.str.upper()

    # Filter on relevant TYPEQU codes
    df = df[df["TYPEQU"].isin(TYPEQU_MAPPING.keys())].copy()
    print(f"After TYPEQU filter: {len(df)} rows.")

    # Use LONGITUDE/LATITUDE directly (WGS84 in 2024 BPE)
    df["LONGITUDE"] = pd.to_numeric(df["LONGITUDE"], errors="coerce")
    df["LATITUDE"] = pd.to_numeric(df["LATITUDE"], errors="coerce")
    df = df.dropna(subset=["LONGITUDE", "LATITUDE"])
    df = df[(df["LONGITUDE"].abs() <= 180) & (df["LATITUDE"].abs() <= 90)]
    print(f"After coordinate filter: {len(df)} rows.")

    # Build rows
    rows = []
    for _, row in df.iterrows():
        typequ = row["TYPEQU"]
        category = TYPEQU_MAPPING.get(typequ)
        if not category:
            continue

        lon = float(row["LONGITUDE"])
        lat = float(row["LATITUDE"])
        depcom = str(row["DEPCOM"]) if pd.notna(row.get("DEPCOM")) else ""
        name = str(row["NOMRS"]).strip() if pd.notna(row.get("NOMRS")) else ""

        rows.append((depcom, typequ, category, name, lon, lat))

    print(f"Inserting {len(rows)} rows...")

    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            execute_values(
                cur,
                """
                INSERT INTO bpe_equipment (depcom, typequ, category, name, geom)
                VALUES %s
                """,
                batch,
                template="(%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))",
            )
            if (i // BATCH_SIZE) % 50 == 0:
                print(f"  ... {i + len(batch)}/{len(rows)} rows inserted")

    conn.commit()
    print(f"Inserted {len(rows)} rows into bpe_equipment.")


def create_indexes(conn):
    """Create spatial and category indexes."""
    print("Creating indexes...")
    with conn.cursor() as cur:
        cur.execute("CREATE INDEX IF NOT EXISTS idx_bpe_geom ON bpe_equipment USING GIST (geom);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_bpe_category ON bpe_equipment (category);")
    conn.commit()
    print("Indexes created.")


def print_stats(conn):
    """Print category counts."""
    with conn.cursor() as cur:
        cur.execute("SELECT category, COUNT(*) FROM bpe_equipment GROUP BY category ORDER BY count DESC;")
        rows = cur.fetchall()
    print("\nBPE counts by category:")
    for category, count in rows:
        print(f"  {category}: {count:,}")
    total = sum(count for _, count in rows)
    print(f"  TOTAL: {total:,}")


def main():
    conn = get_connection()
    try:
        setup_database(conn)
        df = download_bpe()
        process_and_insert(conn, df)
        create_indexes(conn)
        print_stats(conn)
        print("\nBPE import completed successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
