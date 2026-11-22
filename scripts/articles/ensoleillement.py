"""
Article « Les villes les plus ensoleillées de France ».

Durée annuelle d'ensoleillement des normales Météo-France 1991-2020, par station
(`climate_station_normales`). Le nom affiché est celui de la commune de la station : son
identifiant commence par le code INSEE (13054001 → Marignane), là où le nom de station est
abrégé (« ST GATIEN DES B »). Métropole (Corse comprise) et outre-mer sont séparés.

Les grandes villes reçoivent la station que retient la card Climat de l'analyse : la plus
proche qui mesure l'ensoleillement, à moins de 60 km
(`meteo-france-stations.provider.ts`, `RADIUS_METERS.sunshine_hours`).

    python scripts/articles/ensoleillement.py
"""

from statistics import median

from common import connect, fetch, write_snapshot

SLUG = "villes-les-plus-ensoleillees-de-france"
RAYON_KM = 60
NB_GRANDES_VILLES = 20
SEUIL_HAUT = 2500  # heures par an
SEUIL_BAS = 1800

# Collectivités d'outre-mer dont les stations ne portent pas un code INSEE de commune.
TERRITOIRES = {
    "975": "Saint-Pierre-et-Miquelon",
    "984": "Terres australes",
    "985": "Mayotte",
    "986": "Wallis-et-Futuna",
    "987": "Polynésie française",
    "988": "Nouvelle-Calédonie",
}
DEPARTEMENTS_OUTRE_MER = {
    "971": "Guadeloupe",
    "972": "Martinique",
    "973": "Guyane",
    "974": "La Réunion",
    "976": "Mayotte",
}


def titre(nom):
    """« ST GATIEN DES B » → « St Gatien Des B » : repli quand la commune est inconnue."""
    return " ".join(m.capitalize() for m in nom.replace("-", " - ").split()).replace(" - ", "-")


def insee_candidats(station_id):
    code = station_id[:5]
    if code.startswith("20"):  # Corse : la station garde l'ancien code 20, l'INSEE dit 2A/2B
        return [f"2A{code[2:]}", f"2B{code[2:]}"]
    return [code]


def main():
    conn = connect()
    stations = fetch(
        conn,
        """
        SELECT station_id, station_name, altitude_m, temperature_c, precipitation_mm,
               sunshine_hours, period_start, period_end
        FROM climate_station_normales
        WHERE sunshine_hours IS NOT NULL
        ORDER BY sunshine_hours DESC
        """,
    )
    noms = {r["code_commune"]: r["nom"] for r in fetch(conn, "SELECT code_commune, nom FROM commune_shape")}

    metro, outre_mer = [], []
    for s in stations:
        sid = s["station_id"]
        commune = next((noms[c] for c in insee_candidats(sid) if c in noms), None)
        code = next((c for c in insee_candidats(sid) if c in noms), sid[:5])
        ligne = {
            "id": sid,
            "commune": commune or titre(s["station_name"]),
            "station": titre(s["station_name"]),
            "altitude": int(s["altitude_m"]) if s["altitude_m"] is not None else None,
            "heures": round(float(s["sunshine_hours"])),
            "temperature": round(float(s["temperature_c"]), 1) if s["temperature_c"] is not None else None,
            "precipitations": round(float(s["precipitation_mm"])) if s["precipitation_mm"] is not None else None,
        }
        prefixe = sid[:3]
        if sid[:2] <= "95" and not sid.startswith("97") and not sid.startswith("98"):
            ligne["dep"] = code[:2]
            metro.append(ligne)
        else:
            ligne["territoire"] = TERRITOIRES.get(prefixe) or DEPARTEMENTS_OUTRE_MER.get(prefixe, "")
            outre_mer.append(ligne)

    for rang, ligne in enumerate(metro, start=1):
        ligne["rang"] = rang
    rang_metro = {l["id"]: l["rang"] for l in metro}
    par_id = {l["id"]: l for l in metro}

    # Grandes villes : population DGFiP ; Paris, Lyon et Marseille n'ont de contour que par
    # arrondissement, d'où l'union des contours dont le code commence comme la ville.
    villes = fetch(
        conn,
        """
        WITH grandes AS (
          SELECT code_commune, population FROM local_tax_commune
          WHERE annee = (SELECT max(annee) FROM local_tax_commune)
            AND code_commune NOT LIKE '97%%'  -- grandes villes de métropole ; l'outre-mer a son tableau
          ORDER BY population DESC LIMIT %s
        ), formes AS (
          SELECT g.code_commune, g.population,
                 CASE g.code_commune
                   WHEN '75056' THEN (SELECT ST_Union(geom) FROM commune_shape WHERE code_commune LIKE '751__')
                   WHEN '69123' THEN (SELECT ST_Union(geom) FROM commune_shape WHERE code_commune LIKE '6938_')
                   WHEN '13055' THEN (SELECT ST_Union(geom) FROM commune_shape WHERE code_commune LIKE '132__')
                   ELSE (SELECT geom FROM commune_shape c WHERE c.code_commune = g.code_commune)
                 END AS geom
          FROM grandes g
        )
        SELECT f.code_commune, f.population, s.station_id,
               round((ST_Distance(s.geom::geography, ST_PointOnSurface(f.geom)::geography) / 1000)::numeric) AS distance_km
        FROM formes f
        CROSS JOIN LATERAL (
          SELECT station_id, geom FROM climate_station_normales
          WHERE sunshine_hours IS NOT NULL
          ORDER BY geom <-> ST_PointOnSurface(f.geom) LIMIT 1
        ) s
        ORDER BY f.population DESC
        """,
        (NB_GRANDES_VILLES,),
    )
    nom_ville = {"75056": "Paris", "69123": "Lyon", "13055": "Marseille"}
    grandes_villes, sans_station = [], []
    for v in villes:
        if v["distance_km"] is None or float(v["distance_km"]) > RAYON_KM or v["station_id"] not in par_id:
            sans_station.append(nom_ville.get(v["code_commune"]) or noms.get(v["code_commune"], v["code_commune"]))
            continue
        st = par_id[v["station_id"]]
        grandes_villes.append({
            "code": v["code_commune"],
            "nom": nom_ville.get(v["code_commune"]) or noms.get(v["code_commune"], v["code_commune"]),
            "population": v["population"],
            "stationId": v["station_id"],
            "stationCommune": st["commune"],
            "stationNom": st["station"],
            "distanceKm": int(v["distance_km"]),
            "heures": st["heures"],
            "rang": rang_metro[v["station_id"]],
        })
    grandes_villes.sort(key=lambda v: -v["heures"])

    haut, bas = metro[0], metro[-1]
    heures_metro = [l["heures"] for l in metro]
    paris = next((v for v in grandes_villes if v["code"] == "75056"), None)

    write_snapshot(SLUG, {
        "periodeDebut": stations[0]["period_start"],
        "periodeFin": stations[0]["period_end"],
        "rayonKm": RAYON_KM,
        "seuilHaut": SEUIL_HAUT,
        "seuilBas": SEUIL_BAS,
        "nbStations": len(stations),
        "nbMetro": len(metro),
        "nbOutreMer": len(outre_mer),
        "nbGrandesVilles": len(grandes_villes),
        # Faits calculés ici : la prose les cite, le contrôle les retrouve.
        "faits": {
            "plusEnsoleillee": haut["id"],
            "moinsEnsoleillee": bas["id"],
            "ecartHeures": haut["heures"] - bas["heures"],
            "ecartHeuresParJour": round((haut["heures"] - bas["heures"]) / 365, 1),
            "rapport": round(haut["heures"] / bas["heures"], 1),
            "medianeMetro": round(median(heures_metro)),
            "nbAuDessusSeuilHaut": sum(1 for h in heures_metro if h >= SEUIL_HAUT),
            "nbSousSeuilBas": sum(1 for h in heures_metro if h < SEUIL_BAS),
            "ecartParisPlusEnsoleillee": haut["heures"] - paris["heures"] if paris else None,
        },
        "metro": metro,
        "outreMer": outre_mer,
        "grandesVilles": grandes_villes,
        # Pas de station d'ensoleillement à moins de RAYON_KM : la card Climat n'affiche rien non plus.
        "villesSansStation": sans_station,
    })


if __name__ == "__main__":
    main()
