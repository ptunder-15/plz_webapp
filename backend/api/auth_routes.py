"""
Auth-Routen: Login, Logout, Registrierung, Passwort-Reset, Einladungs-Annahme
"""
import os
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from .auth import (
    create_session_token,
    decode_session_token,
    generate_secure_token,
    get_current_user,
    get_invite_expiry,
    get_reset_expiry,
    hash_password,
    verify_password,
    DEV_EMAIL,
)
from database import (
    count_users,
    create_invite_token_in_db,
    create_team_in_db,
    create_user_in_db,
    get_invite_token_in_db,
    get_password_reset_token_in_db,
    get_teams_for_user_in_db,
    get_user_by_email,
    update_user_password_in_db,
    use_invite_token_in_db,
    use_password_reset_token_in_db,
    add_team_member_in_db,
    create_password_reset_token_in_db,
)
from .email_service import send_invite_email, send_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

APP_URL = os.getenv("APP_URL", "http://localhost:5173")

COOKIE_KWARGS = {
    "key": "session",
    "httponly": True,
    "samesite": "lax",
    "secure": APP_URL.startswith("https"),
    "max_age": 60 * 60 * 24 * 30,  # 30 Tage
}


# ── Request-Modelle ───────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    password_confirm: str


class AcceptInviteRequest(BaseModel):
    token: str
    password: str
    password_confirm: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str
    password_confirm: str


# ── Hilfsfunktionen ───────────────────────────────────────────────────────────

def _validate_password(password: str, confirm: str) -> None:
    if password != confirm:
        raise HTTPException(status_code=400, detail="Passwörter stimmen nicht überein.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 8 Zeichen haben.")


def _set_session_cookie(response: Response, email: str) -> None:
    token = create_session_token(email)
    response.set_cookie(value=token, **COOKIE_KWARGS)


# ── Routen ────────────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(user_email: str = Depends(get_current_user)):
    user = get_user_by_email(user_email)
    if not user and user_email != DEV_EMAIL:
        raise HTTPException(status_code=401, detail="Nutzer nicht gefunden.")
    teams = get_teams_for_user_in_db(user_email)
    return {
        "email": user_email,
        "teams": teams,
    }


@router.post("/login")
def login(payload: LoginRequest, response: Response):
    email = payload.email.strip().lower()
    user = get_user_by_email(email)

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort falsch.")

    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="Dein Account ist deaktiviert.")

    _set_session_cookie(response, email)
    teams = get_teams_for_user_in_db(email)

    return {
        "message": "Eingeloggt.",
        "email": email,
        "teams": teams,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="session", httponly=True, samesite="lax")
    return {"message": "Ausgeloggt."}


@router.post("/register")
def register(payload: RegisterRequest, response: Response):
    """
    Erste Registrierung: Nur möglich wenn noch kein Nutzer existiert.
    Danach nur noch per Einladung.
    """
    if count_users() > 0:
        raise HTTPException(
            status_code=403,
            detail="Registrierung nur per Einladung möglich. Bitte einen Admin um einen Einladungslink.",
        )

    _validate_password(payload.password, payload.password_confirm)
    email = payload.email.strip().lower()

    if get_user_by_email(email):
        raise HTTPException(status_code=400, detail="Diese E-Mail-Adresse ist bereits registriert.")

    pw_hash = hash_password(payload.password)
    create_user_in_db(email, pw_hash)

    # Ersten Nutzer automatisch ein eigenes Team erstellen
    create_team_in_db("Mein Team", email)

    _set_session_cookie(response, email)
    teams = get_teams_for_user_in_db(email)

    return {
        "message": "Account erstellt. Willkommen!",
        "email": email,
        "teams": teams,
    }


@router.post("/accept-invite")
def accept_invite(payload: AcceptInviteRequest, response: Response):
    """
    Einladung annehmen: Nutzer setzt sein Passwort und wird ins Team aufgenommen.
    """
    invite = get_invite_token_in_db(payload.token)

    if not invite:
        raise HTTPException(status_code=404, detail="Einladungslink nicht gefunden.")

    if invite["used_at"] is not None:
        raise HTTPException(status_code=400, detail="Dieser Einladungslink wurde bereits verwendet.")

    expires_at = invite["expires_at"]
    from datetime import datetime
    now = datetime.now(timezone.utc)
    # Handle tz-naive datetimes from DB
    if expires_at.tzinfo is None:
        from datetime import timezone as tz
        expires_at = expires_at.replace(tzinfo=tz.utc)

    if now > expires_at:
        raise HTTPException(status_code=400, detail="Dieser Einladungslink ist abgelaufen.")

    _validate_password(payload.password, payload.password_confirm)
    email = invite["email"]

    # Nutzer anlegen oder bestehendem Passwort-Hash aktualisieren
    existing_user = get_user_by_email(email)
    pw_hash = hash_password(payload.password)

    if existing_user:
        update_user_password_in_db(email, pw_hash)
    else:
        create_user_in_db(email, pw_hash)

    # Team-Mitgliedschaft herstellen (falls Einladung ein Team hat)
    if invite["team_id"]:
        add_team_member_in_db(
            team_id=invite["team_id"],
            user_email=email,
            role=invite["role"],
            invited_by=invite["invited_by"],
        )

    use_invite_token_in_db(invite["id"])
    _set_session_cookie(response, email)
    teams = get_teams_for_user_in_db(email)

    return {
        "message": "Einladung angenommen. Willkommen!",
        "email": email,
        "teams": teams,
    }


@router.get("/invite-info/{token}")
def get_invite_info(token: str):
    """Gibt Infos über einen Einladungslink zurück (für die Anzeige im Frontend)."""
    invite = get_invite_token_in_db(token)

    if not invite:
        raise HTTPException(status_code=404, detail="Einladungslink nicht gefunden.")

    if invite["used_at"] is not None:
        raise HTTPException(status_code=400, detail="Dieser Einladungslink wurde bereits verwendet.")

    from datetime import datetime
    expires_at = invite["expires_at"]
    if expires_at.tzinfo is None:
        from datetime import timezone as tz
        expires_at = expires_at.replace(tzinfo=tz.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Dieser Einladungslink ist abgelaufen.")

    return {
        "email": invite["email"],
        "role": invite["role"],
        "invited_by": invite["invited_by"],
    }


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.strip().lower()
    user = get_user_by_email(email)

    # Immer gleiche Antwort (gegen User-Enumeration)
    if user:
        token = generate_secure_token()
        expires_at = get_reset_expiry()
        create_password_reset_token_in_db(email, token, expires_at)
        reset_url = f"{APP_URL}/reset-password?token={token}"
        send_reset_email(email, reset_url)

    return {
        "message": "Falls diese E-Mail existiert, wurde ein Reset-Link verschickt."
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, response: Response):
    token_data = get_password_reset_token_in_db(payload.token)

    if not token_data:
        raise HTTPException(status_code=404, detail="Reset-Link nicht gefunden.")

    if token_data["used_at"] is not None:
        raise HTTPException(status_code=400, detail="Dieser Reset-Link wurde bereits verwendet.")

    from datetime import datetime
    expires_at = token_data["expires_at"]
    if expires_at.tzinfo is None:
        from datetime import timezone as tz
        expires_at = expires_at.replace(tzinfo=tz.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Dieser Reset-Link ist abgelaufen.")

    _validate_password(payload.password, payload.password_confirm)

    email = token_data["email"]
    update_user_password_in_db(email, hash_password(payload.password))
    use_password_reset_token_in_db(token_data["id"])

    _set_session_cookie(response, email)
    return {"message": "Passwort erfolgreich geändert."}
