from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel

# NEU: Wir importieren unseren Türsteher
from .auth import get_current_user

from database import (
    create_group_in_db,
    delete_group_in_db,
    fetch_groups_from_db,
    update_group_in_db,
)

router = APIRouter(prefix="/groups", tags=["groups"])


class GroupCreateRequest(BaseModel):
    tab_id: int
    name: str
    color: str
    value: Optional[float] = None


class GroupUpdateRequest(BaseModel):
    name: str
    color: str
    value: Optional[float] = None


def validate_group_name(name: str) -> str:
    normalized = str(name).strip()

    if not normalized:
        raise HTTPException(
            status_code=400,
            detail="Der Gruppenname darf nicht leer sein."
        )

    if len(normalized) > 100:
        raise HTTPException(
            status_code=400,
            detail="Der Gruppenname ist zu lang."
        )

    return normalized


def validate_group_color(color: str) -> str:
    normalized = str(color).strip()

    if not normalized:
        raise HTTPException(
            status_code=400,
            detail="Bitte eine Farbe angeben."
        )

    if not normalized.startswith("#") or len(normalized) not in [4, 7]:
        raise HTTPException(
            status_code=400,
            detail="Die Farbe muss als Hex-Wert wie #2563eb angegeben werden."
        )

    return normalized


@router.get("/")
def get_groups(
    tab_id: Optional[int] = Query(default=None),
    user_email: str = Depends(get_current_user)
):
    # Gibt nur die Gruppen zurück, die zu den Tabs des Nutzers gehören
    return fetch_groups_from_db(tab_id=tab_id, user_email=user_email)


@router.post("/")
def create_group(
    payload: GroupCreateRequest,
    user_email: str = Depends(get_current_user)
):
    normalized_name = validate_group_name(payload.name)
    normalized_color = validate_group_color(payload.color)

    created_group = create_group_in_db(
        tab_id=payload.tab_id,
        name=normalized_name,
        color=normalized_color,
        value=payload.value,
    )

    return {
        "message": "Gruppe wurde angelegt.",
        "group": created_group,
        "groups": fetch_groups_from_db(tab_id=payload.tab_id, user_email=user_email),
    }


@router.patch("/{group_id}")
def update_group(
    group_id: int, 
    payload: GroupUpdateRequest,
    user_email: str = Depends(get_current_user)
):
    # Sicherheits-Check: Gehört diese Gruppe überhaupt dem Nutzer?
    existing_groups = fetch_groups_from_db(user_email=user_email)
    if not any(g["id"] == group_id for g in existing_groups):
        raise HTTPException(
            status_code=404,
            detail="Gruppe wurde nicht gefunden oder gehört dir nicht."
        )

    normalized_name = validate_group_name(payload.name)
    normalized_color = validate_group_color(payload.color)

    updated_group = update_group_in_db(
        group_id=group_id,
        name=normalized_name,
        color=normalized_color,
        value=payload.value,
    )

    if not updated_group:
        raise HTTPException(
            status_code=404,
            detail="Gruppe wurde nicht gefunden."
        )

    return {
        "message": "Gruppe wurde aktualisiert.",
        "group": updated_group,
        "groups": fetch_groups_from_db(tab_id=updated_group["tab_id"], user_email=user_email),
    }


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    user_email: str = Depends(get_current_user)
):
    # Lade nur die Gruppen dieses Nutzers
    existing_groups = fetch_groups_from_db(user_email=user_email)
    existing_group = None

    for group in existing_groups:
        if group["id"] == group_id:
            existing_group = group
            break

    # Wenn die Gruppe nicht in seiner Liste ist, verweigern
    if not existing_group:
        raise HTTPException(
            status_code=404,
            detail="Gruppe wurde nicht gefunden oder gehört dir nicht."
        )

    removed_count = delete_group_in_db(group_id)

    if removed_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Gruppe wurde nicht gefunden."
        )

    return {
        "message": "Gruppe wurde gelöscht.",
        "groups": fetch_groups_from_db(tab_id=existing_group["tab_id"], user_email=user_email),
    }