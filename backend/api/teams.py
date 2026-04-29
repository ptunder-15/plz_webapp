import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .auth import ROLE_HIERARCHY, get_current_user, verify_team_access, generate_secure_token, get_invite_expiry
from .email_service import send_invite_email
from database import (
    add_team_member_in_db,
    create_invite_token_in_db,
    create_team_in_db,
    get_team_members_in_db,
    get_teams_for_user_in_db,
    remove_team_member_in_db,
    rename_team_in_db,
    update_team_member_role_in_db,
)

router = APIRouter(prefix="/teams", tags=["teams"])

APP_URL = os.getenv("APP_URL", "http://localhost:5173")
VALID_ROLES = {"admin", "editor", "viewer"}


class TeamCreateRequest(BaseModel):
    name: str


class TeamRenameRequest(BaseModel):
    name: str


class MemberInviteRequest(BaseModel):
    user_email: str
    role: str = "editor"


class MemberRoleUpdateRequest(BaseModel):
    role: str


@router.get("/")
def get_my_teams(user_email: str = Depends(get_current_user)):
    teams = get_teams_for_user_in_db(user_email)
    if not teams:
        team = create_team_in_db("Mein Team", user_email)
        teams = [team]
    return teams


@router.post("/")
def create_team(payload: TeamCreateRequest, user_email: str = Depends(get_current_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Team-Name darf nicht leer sein.")
    team = create_team_in_db(name, user_email)
    return {"message": "Team wurde erstellt.", "team": team}


@router.patch("/{team_id}")
def rename_team(
    team_id: int,
    payload: TeamRenameRequest,
    user_email: str = Depends(get_current_user),
):
    verify_team_access(team_id, user_email, min_role="admin")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Team-Name darf nicht leer sein.")
    updated = rename_team_in_db(team_id, name)
    if not updated:
        raise HTTPException(status_code=404, detail="Team nicht gefunden.")
    return {"message": "Team umbenannt.", "team": updated}


@router.get("/{team_id}/members")
def get_members(team_id: int, user_email: str = Depends(get_current_user)):
    verify_team_access(team_id, user_email, min_role="viewer")
    return get_team_members_in_db(team_id)


@router.post("/{team_id}/members")
def invite_member(
    team_id: int,
    payload: MemberInviteRequest,
    user_email: str = Depends(get_current_user),
):
    verify_team_access(team_id, user_email, min_role="admin")

    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültige Rolle. Erlaubt: {', '.join(VALID_ROLES)}",
        )

    invite_email = payload.user_email.strip().lower()
    if not invite_email:
        raise HTTPException(status_code=400, detail="E-Mail-Adresse fehlt.")

    # Einladungstoken erstellen
    token = generate_secure_token()
    expires_at = get_invite_expiry()
    create_invite_token_in_db(
        email=invite_email,
        team_id=team_id,
        role=payload.role,
        invited_by=user_email,
        token=token,
        expires_at=expires_at,
    )

    # Team-Name für die E-Mail
    teams = get_teams_for_user_in_db(user_email)
    team_name = next((t["name"] for t in teams if t["id"] == team_id), "Dein Team")

    invite_url = f"{APP_URL}/invite?token={token}"
    send_invite_email(
        to_email=invite_email,
        invite_url=invite_url,
        invited_by=user_email,
        team_name=team_name,
    )

    return {
        "message": f"Einladungslink für {invite_email} wurde erstellt und verschickt.",
        "invite_url": invite_url,  # Auch zurückgeben, falls E-Mail nicht konfiguriert
        "members": get_team_members_in_db(team_id),
    }


@router.patch("/{team_id}/members/{member_email}")
def update_member_role(
    team_id: int,
    member_email: str,
    payload: MemberRoleUpdateRequest,
    user_email: str = Depends(get_current_user),
):
    verify_team_access(team_id, user_email, min_role="admin")

    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültige Rolle. Erlaubt: {', '.join(VALID_ROLES)}",
        )

    if member_email == user_email and payload.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="Du kannst deine eigene Admin-Rolle nicht ändern.",
        )

    updated = update_team_member_role_in_db(team_id, member_email, payload.role)
    if not updated:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden.")

    return {
        "message": f"Rolle von {member_email} auf '{payload.role}' geändert.",
        "members": get_team_members_in_db(team_id),
    }


@router.delete("/{team_id}/members/{member_email}")
def remove_member(
    team_id: int,
    member_email: str,
    user_email: str = Depends(get_current_user),
):
    verify_team_access(team_id, user_email, min_role="admin")

    if member_email == user_email:
        raise HTTPException(
            status_code=400, detail="Du kannst dich nicht selbst aus dem Team entfernen."
        )

    removed = remove_team_member_in_db(team_id, member_email)
    if removed == 0:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden.")

    return {
        "message": f"{member_email} wurde aus dem Team entfernt.",
        "members": get_team_members_in_db(team_id),
    }
