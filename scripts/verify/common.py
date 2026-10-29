"""
Outils communs du contrôle : accès HTTP, géocodage, géométrie, et la forme d'un résultat.

Le contrôle ne réutilise rien du code TypeScript du site : il relit les sources publiques par
son propre chemin, pour ne pas reproduire les erreurs qu'il cherche.
"""

import json
import math
import time
import unicodedata
from dataclasses import asdict, dataclass, field
from pathlib import Path

import requests

ROOT = Path(__file__).parent
OUT = ROOT / "out"
CACHE = OUT / "cache"

USER_AGENT = "ClaireAdresse-verification/1.0 (+https://claireadresse.fr)"

# Statuts d'un chiffre. L'ordre sert au tri du rapport : le plus grave d'abord.
ERREUR = "erreur"        # le site affiche autre chose que la source
METHODE = "methode"      # le site calcule autrement que la page publique : à trancher
ARRONDI = "arrondi"      # écart d'arrondi, dans la tolérance déclarée
A_RELIRE = "a_relire"    # à vérifier à la main
OK = "ok"                # identique à la source
STATUTS = [ERREUR, METHODE, ARRONDI, A_RELIRE, OK]


@dataclass
class Check:
    """Un chiffre contrôlé."""

    domaine: str
    chiffre: str
    site: object
    source: object
    statut: str
    lien: str = ""
    note: str = ""


@dataclass
class Address:
    slug: str
    label: str
    lat: float
    lon: float
    citycode: str
    ban_id: str
    type: str
    extra: dict = field(default_factory=dict)


_session = requests.Session()
_session.headers["User-Agent"] = USER_AGENT
_last_call: dict[str, float] = {}


def get(url: str, *, params=None, min_interval: float = 0.0, timeout: float = 30, retries: int = 3, **kw):
    """GET avec nouvelles tentatives, et un intervalle minimal par hôte (Géorisques : 1 appel/s)."""
    host = requests.utils.urlparse(url).netloc
    for attempt in range(1, retries + 1):
        wait = _last_call.get(host, 0) + min_interval - time.time()
        if wait > 0:
            time.sleep(wait)
        _last_call[host] = time.time()
        try:
            r = _session.get(url, params=params, timeout=timeout, **kw)
            if r.status_code in (429, 502, 503, 504) and attempt < retries:
                time.sleep(2 * attempt)
                continue
            return r
        except requests.RequestException:
            if attempt == retries:
                raise
            time.sleep(2 * attempt)
    raise RuntimeError(f"échec de {url}")


def cached_download(url: str, dest: Path) -> Path | None:
    """Télécharge une fois ; `None` si la ressource n'existe pas (404)."""
    if dest.exists():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = get(url, timeout=120, allow_redirects=True)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


def slugify(text: str) -> str:
    t = unicodedata.normalize("NFD", text.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return "-".join("".join(c if c.isalnum() else " " for c in t).split())[:80]


def geocode(query: str) -> Address:
    """Géocodage par le service de la Base Adresse Nationale, comme le site."""
    r = get("https://data.geopf.fr/geocodage/search", params={"q": query, "limit": 1})
    r.raise_for_status()
    feats = r.json()["features"]
    if not feats:
        raise ValueError(f"adresse introuvable : {query}")
    p = feats[0]["properties"]
    lon, lat = feats[0]["geometry"]["coordinates"]
    return Address(
        slug=slugify(p["label"]),
        label=p["label"],
        lat=lat,
        lon=lon,
        citycode=p["citycode"],
        ban_id=p.get("id", ""),
        type=p.get("type", ""),
        extra={"city": p.get("city", ""), "postcode": p.get("postcode", "")},
    )


def distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance à vol d'oiseau (haversine), en mètres."""
    r = 6_371_008.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def offset(lat: float, lon: float, dist_m: float, bearing_deg: float) -> tuple[float, float]:
    """Point à `dist_m` mètres dans la direction donnée (approximation locale)."""
    b = math.radians(bearing_deg)
    dlat = dist_m * math.cos(b) / 111_320
    dlon = dist_m * math.sin(b) / (111_320 * math.cos(math.radians(lat)))
    return lat + dlat, lon + dlon


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1, default=str), encoding="utf-8")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def checks_to_dicts(checks: list[Check]) -> list[dict]:
    return [asdict(c) for c in checks]
