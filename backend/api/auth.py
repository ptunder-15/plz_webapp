import json
import os
import time
import urllib.request

import jwt
from fastapi import HTTPException, Request

CF_ACCESS_TEAM_DOMAIN = os.getenv("CF_ACCESS_TEAM_DOMAIN", "")
CF_ACCESS_AUD = os.getenv("CF_ACCESS_AUD", "")

_jwks_cache: dict = {"keys": {}, "fetched_at": 0.0}
_JWKS_TTL = 3600  # Public Keys stündlich neu laden


def _fetch_cloudflare_public_keys() -> dict:
    """Lädt Cloudflare's öffentliche JWKS-Schlüssel und cached sie."""
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL:
        return _jwks_cache["keys"]

    url = f"https://{CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            jwks = json.loads(resp.read().decode())
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Cloudflare JWKS-Schlüssel konnten nicht geladen werden: {e}",
        )

    keys = {}
    for key_data in jwks.get("keys", []):
        kid = key_data.get("kid")
        if kid:
            keys[kid] = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))

    _jwks_cache["keys"] = keys
    _jwks_cache["fetched_at"] = now
    return keys


def _verify_cf_jwt(token: str) -> str:
    """Verifiziert ein Cloudflare Access JWT und gibt die E-Mail zurück."""
    if not CF_ACCESS_TEAM_DOMAIN or not CF_ACCESS_AUD:
        raise HTTPException(
            status_code=500,
            detail="CF_ACCESS_TEAM_DOMAIN und CF_ACCESS_AUD müssen in .env gesetzt sein.",
        )

    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        public_keys = _fetch_cloudflare_public_keys()
        public_key = public_keys.get(kid)

        if not public_key:
            # Keys könnten rotiert worden sein — Cache zurücksetzen
            _jwks_cache["fetched_at"] = 0.0
            public_keys = _fetch_cloudflare_public_keys()
            public_key = public_keys.get(kid)

        if not public_key:
            raise HTTPException(status_code=401, detail="Unbekannter JWT Key ID.")

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=CF_ACCESS_AUD,
        )

        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Kein E-Mail-Feld im JWT-Token.")

        return email

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="JWT-Token ist abgelaufen.")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="JWT-Token hat falsche Audience (AUD).")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Ungültiges JWT-Token: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"JWT-Verifikation fehlgeschlagen: {e}")


def get_current_user(request: Request) -> str:
    # Lokale Entwicklung: Auth-Bypass für localhost
    host = request.headers.get("host", "")
    if "localhost" in host or "127.0.0.1" in host:
        return "admin@standard-grid.com"

    # JWT verifizieren (einziger erlaubter Weg in Produktion)
    jwt_token = request.headers.get("cf-access-jwt-assertion")
    if jwt_token:
        return _verify_cf_jwt(jwt_token)

    raise HTTPException(
        status_code=401,
        detail="Zugriff verweigert. Kein gültiges Cloudflare-Token gefunden.",
    )
