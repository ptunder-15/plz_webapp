from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from .auth import get_current_user, verify_tab_team_access
from database import (
    create_tab_in_db,
    delete_tab_in_db,
    fetch_tabs_from_db,
    get_tab_owner,
    update_tab_in_db,
)

router = APIRouter(prefix="/tabs", tags=["tabs"])


class TabCreateRequest(BaseModel):
    name: str


class TabUpdateRequest(BaseModel):
    name: str


def validate_tab_name(name: str) -> str:
    normalized = str(name).strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Der Tab-Name darf nicht leer sein.")
    if len(normalized) > 100:
        raise HTTPException(status_code=400, detail="Der Tab-Name ist zu lang.")
    return normalized


@router.get("/")
def get_tabs(user_email: str = Depends(get_current_user)):
    return fetch_tabs_from_db(user_email=user_email)


@router.post("/")
def create_tab(
    payload: TabCreateRequest,
    user_email: str = Depends(get_current_user),
):
    normalized_name = validate_tab_name(payload.name)
    try:
        created_tab = create_tab_in_db(normalized_name, owner_email=user_email)
    except Exception as error:
        error_message = str(error).lower()
        if "unique" in error_message or "duplicate" in error_message:
            raise HTTPException(status_code=400, detail="Ein Tab mit diesem Namen existiert bereits.")
        raise

    return {
        "message": "Tab wurde angelegt.",
        "tab": created_tab,
        "tabs": fetch_tabs_from_db(user_email=user_email),
    }


@router.patch("/{tab_id}")
def update_tab(
    tab_id: int,
    payload: TabUpdateRequest,
    user_email: str = Depends(get_current_user),
):
    verify_tab_team_access(tab_id, user_email, min_role="admin")
    normalized_name = validate_tab_name(payload.name)

    try:
        updated_tab = update_tab_in_db(tab_id, normalized_name)
    except Exception as error:
        error_message = str(error).lower()
        if "unique" in error_message or "duplicate" in error_message:
            raise HTTPException(status_code=400, detail="Ein Tab mit diesem Namen existiert bereits.")
        raise

    if not updated_tab:
        raise HTTPException(status_code=404, detail="Tab wurde nicht gefunden.")

    return {
        "message": "Tab wurde aktualisiert.",
        "tab": updated_tab,
        "tabs": fetch_tabs_from_db(user_email=user_email),
    }


@router.delete("/{tab_id}")
def delete_tab(
    tab_id: int,
    user_email: str = Depends(get_current_user),
):
    verify_tab_team_access(tab_id, user_email, min_role="admin")

    existing_tabs = fetch_tabs_from_db(user_email=user_email)
    owned_tabs = [t for t in existing_tabs if t["owner_email"] == user_email]

    if len(owned_tabs) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Der letzte eigene Tab kann nicht gelöscht werden.",
        )

    if not any(t["id"] == tab_id for t in existing_tabs):
        raise HTTPException(status_code=404, detail="Tab nicht gefunden.")

    removed_count = delete_tab_in_db(tab_id)
    if removed_count == 0:
        raise HTTPException(status_code=404, detail="Tab wurde nicht gefunden.")

    return {
        "message": "Tab wurde gelöscht.",
        "tabs": fetch_tabs_from_db(user_email=user_email),
    }
