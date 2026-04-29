import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, Request

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production-please")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

ROLE_HIERARCHY = {"viewer": 0, "editor": 1, "admin": 2}

DEV_EMAIL = "ptunder@keslar.de"


# ── Passwort-Hashing ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_session_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> str:
    """Gibt die E-Mail zurück oder wirft HTTPException."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Ungültiger Token.")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session abgelaufen. Bitte neu einloggen.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ungültiger Token.")


# ── Einladungs- und Reset-Tokens ──────────────────────────────────────────────

def generate_secure_token() -> str:
    return secrets.token_urlsafe(32)


def get_invite_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=7)


def get_reset_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=2)


# ── FastAPI Dependency ────────────────────────────────────────────────────────

def get_current_user(request: Request) -> str:
    host = request.headers.get("host", "")
    if "localhost" in host or "127.0.0.1" in host:
        return DEV_EMAIL

    token = request.cookies.get("session")
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Nicht eingeloggt. Bitte anmelden.",
        )
    return decode_session_token(token)


# ── Team-Zugriff ──────────────────────────────────────────────────────────────

def verify_team_access(team_id: int, user_email: str, min_role: str = "viewer") -> str:
    from database import get_user_role_in_team

    role = get_user_role_in_team(team_id, user_email)
    if role is None:
        raise HTTPException(status_code=403, detail="Du bist kein Mitglied dieses Teams.")
    if ROLE_HIERARCHY.get(role, -1) < ROLE_HIERARCHY.get(min_role, 0):
        raise HTTPException(
            status_code=403,
            detail=f"Für diese Aktion wird mindestens die Rolle '{min_role}' benötigt.",
        )
    return role


def verify_tab_team_access(tab_id: int, user_email: str, min_role: str = "editor") -> str:
    """Check tab-level access: owner has admin, tab_members have their assigned role."""
    from database import get_tab_owner, get_user_role_in_tab

    owner = get_tab_owner(tab_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="Tab nicht gefunden.")

    if owner == user_email:
        role = "admin"
    else:
        role = get_user_role_in_tab(tab_id, user_email)
        if role is None:
            raise HTTPException(status_code=403, detail="Du hast keinen Zugriff auf diesen Tab.")

    if ROLE_HIERARCHY.get(role, -1) < ROLE_HIERARCHY.get(min_role, 0):
        raise HTTPException(
            status_code=403,
            detail=f"Für diese Aktion wird mindestens die Rolle '{min_role}' benötigt.",
        )
    return role
