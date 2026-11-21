"""
Outils partagés des scripts d'articles.

Chaque script calcule les chiffres d'un article et les fige dans
`frontend/src/content/articles/<slug>/data.json`. Le site ne lit jamais la base pour un
article : le build Docker se fait sans base, et un article publie des chiffres datés,
recalculés au millésime suivant.

Environnement : POSTGRES_URL (lu aussi depuis frontend/.env).
"""

import json
import os
import sys
from datetime import date
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
ARTICLES_DIR = ROOT / "frontend" / "src" / "content" / "articles"

load_dotenv()
load_dotenv(ROOT / "frontend" / ".env")


def connect():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Erreur : la variable POSTGRES_URL est requise.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def fetch(conn, sql, params=None):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def write_snapshot(slug, payload):
    """Écrit `data.json` : `generatedAt` d'abord, puis les champs propres à l'article."""
    out = ARTICLES_DIR / slug / "data.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    data = {"generatedAt": date.today().isoformat(), **payload}
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"→ {out.relative_to(ROOT)}")
