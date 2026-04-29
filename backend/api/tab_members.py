import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .auth import ROLE_HIERARCHY, get_current_user, verify_tab_team_access, generate_secure_token, get_invite_expiry
from .email_service import send_invite_email
from database import (
    add_tab_member_in_db,
    create_invite_token_in_db,
    get_tab_members_in_db,
    get_tab_owner,
    get_team_id_for_tab,
    remove_tab_member_in_db,
    update_tab_member_role_in_db,
    fetch_tabs_from_db,
)

router = APIRouter(prefix="/tabs", tags=["tab-members"])

APP_URL = os.getenv("APP_URL", "http://localhost:5173")
VALID_ROLES = {"editor", "viewer"}
ROLE_LABELS = {"editor": "Bearbeiter", "viewer": "Betrachter"}


class MemberInviteRequest(BaseModel):
    user_email: str
    role: str = "editor"


class MemberRoleUpdateRequest(BaseModel):
    role: str


@router.get("/{tab_id}/members")
def get_members(tab_id: int, user_email: str = Depends(get_current_user)):
    role = verify_tab_team_access(tab_id, user_email, min_role="viewer")
    owner = get_tab_owner(tab_id)
    members = get_tab_members_in_db(tab_id)
    return {
        "owner": owner,
        "members": members,
        "user_role": role,
    }


@router.post("/{tab_id}/members")
def invite_member(
    tab_id: int,
    payload: MemberInviteRequest,
    user_email: str = Depends(get_current_user),
):
    verify_tab_team_access(tab_id, user_email, min_role="admin")

    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültige Rolle. Erlaubt: {', '.join(VALID_ROLES)}",
        )

    invite_email = payload.user_email.strip().lower()
    if not invite_email:
        raise HTTPException(status_code=400, detail="E-Mail-Adresse fehlt.")

    owner = get_tab_owner(tab_id)
    if invite_email == owner:
        raise HTTPException(status_code=400, detail="Der Tab-Inhaber kann nicht eingeladen werden.")

    token = generate_secure_token()
    expires_at = get_invite_expiry()
    create_invite_token_in_db(
        email=invite_email,
        tab_id=tab_id,
        role=payload.role,
        invited_by=user_email,
        token=token,
        expires_at=expires_at,
    )

    invite_url = f"{APP_URL}/invite?token={token}"

    # Get the tab name for the email
    tabs = fetch_tabs_from_db(user_email)
    tab_name = next((t["name"] for t in tabs if t["id"] == tab_id), "Dein Tab")

    send_invite_email(
        to_email=invite_email,
        invite_url=invite_url,
        invited_by=user_email,
        team_name=tab_name,
    )

    return {
        "message": f"Einladungslink für {invite_email} wurde erstellt.",
        "invite_url": invite_url,
        "members": get_tab_members_in_db(tab_id),
    }


@router.patch("/{tab_id}/members/{member_email}")
def update_member_role(
    tab_id: int,
    member_email: str,
    payload: MemberRoleUpdateRequest,
    user_email: str = Depends(get_current_user),
):
    verify_tab_team_access(tab_id, user_email, min_role="admin")

    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültige Rolle. Erlaubt: {', '.join(VALID_ROLES)}",
        )

    updated = update_tab_member_role_in_db(tab_id, member_email, payload.role)
    if not updated:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden.")

    return {
        "message": f"Rolle von {member_email} geändert.",
        "members": get_tab_members_in_db(tab_id),
    }


@router.delete("/{tab_id}/members/{member_email}")
def remove_member(
    tab_id: int,
    member_email: str,
    user_email: str = Depends(get_current_user),
):
    verify_tab_team_access(tab_id, user_email, min_role="admin")

    owner = get_tab_owner(tab_id)
    if member_email == owner:
        raise HTTPException(status_code=400, detail="Der Tab-Inhaber kann nicht entfernt werden.")

    removed = remove_tab_member_in_db(tab_id, member_email)
    if removed == 0:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden.")

    return {
        "message": f"{member_email} wurde entfernt.",
        "members": get_tab_members_in_db(tab_id),
    }
