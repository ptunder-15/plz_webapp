from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

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
def get_groups(tab_id: Optional[int] = Query(default=None)):
    return fetch_groups_from_db(tab_id=tab_id)


@router.post("/")
def create_group(payload: GroupCreateRequest):
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
        "groups": fetch_groups_from_db(tab_id=payload.tab_id),
    }


@router.patch("/{group_id}")
def update_group(group_id: int, payload: GroupUpdateRequest):
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
        "groups": fetch_groups_from_db(tab_id=updated_group["tab_id"]),
    }


@router.delete("/{group_id}")
def delete_group(group_id: int):
    existing_groups = fetch_groups_from_db()
    existing_group = None

    for group in existing_groups:
        if group["id"] == group_id:
            existing_group = group
            break

    if not existing_group:
        raise HTTPException(
            status_code=404,
            detail="Gruppe wurde nicht gefunden."
        )

    removed_count = delete_group_in_db(group_id)

    if removed_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Gruppe wurde nicht gefunden."
        )

    return {
        "message": "Gruppe wurde gelöscht.",
        "groups": fetch_groups_from_db(tab_id=existing_group["tab_id"]),
    }