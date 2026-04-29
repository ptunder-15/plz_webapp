from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel

from .auth import get_current_user, verify_team_access, verify_tab_team_access
from database import (
    create_tab_in_db,
    delete_tab_in_db,
    fetch_tabs_from_db,
    get_team_id_for_tab,
    update_tab_in_db,
)

router = APIRouter(prefix="/tabs", tags=["tabs"])


class TabCreateRequest(BaseModel):
    name: str
    team_id: int


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
def get_tabs(
    team_id: int = Query(...),
    user_email: str = Depends(get_current_user),
):
    verify_team_access(team_id, user_email, min_role="viewer")
    return fetch_tabs_from_db(team_id=team_id)


@router.post("/")
def create_tab(
    payload: TabCreateRequest,
    user_email: str = Depends(get_current_user),
):
    verify_team_access(payload.team_id, user_email, min_role="editor")
    normalized_name = validate_tab_name(payload.name)

    try:
        created_tab = create_tab_in_db(normalized_name, team_id=payload.team_id)
    except Exception as error:
        error_message = str(error).lower()
        if "unique" in error_message or "duplicate" in error_message:
            raise HTTPException(
                status_code=400,
                detail="Ein Tab mit diesem Namen existiert bereits.",
            )
        raise

    return {
        "message": "Tab wurde angelegt.",
        "tab": created_tab,
        "tabs": fetch_tabs_from_db(team_id=payload.team_id),
    }


@router.patch("/{tab_id}")
def update_tab(
    tab_id: int,
    payload: TabUpdateRequest,
    user_email: str = Depends(get_current_user),
):
    team_id = get_team_id_for_tab(tab_id)
    if team_id is None:
        raise HTTPException(status_code=404, detail="Tab nicht gefunden.")

    verify_team_access(team_id, user_email, min_role="editor")
    normalized_name = validate_tab_name(payload.name)

    try:
        updated_tab = update_tab_in_db(tab_id, normalized_name, team_id=team_id)
    except Exception as error:
        error_message = str(error).lower()
        if "unique" in error_message or "duplicate" in error_message:
            raise HTTPException(
                status_code=400,
                detail="Ein Tab mit diesem Namen existiert bereits.",
            )
        raise

    if not updated_tab:
        raise HTTPException(status_code=404, detail="Tab wurde nicht gefunden.")

    return {
        "message": "Tab wurde aktualisiert.",
        "tab": updated_tab,
        "tabs": fetch_tabs_from_db(team_id=team_id),
    }


@router.delete("/{tab_id}")
def delete_tab(
    tab_id: int,
    user_email: str = Depends(get_current_user),
):
    team_id = get_team_id_for_tab(tab_id)
    if team_id is None:
        raise HTTPException(status_code=404, detail="Tab nicht gefunden.")

    verify_team_access(team_id, user_email, min_role="editor")

    existing_tabs = fetch_tabs_from_db(team_id=team_id)

    if len(existing_tabs) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Der letzte verbleibende Tab kann nicht gelöscht werden.",
        )

    if not any(t["id"] == tab_id for t in existing_tabs):
        raise HTTPException(status_code=404, detail="Tab nicht gefunden.")

    removed_count = delete_tab_in_db(tab_id, team_id=team_id)

    if removed_count == 0:
        raise HTTPException(status_code=404, detail="Tab wurde nicht gefunden.")

    return {
        "message": "Tab wurde gelöscht.",
        "tabs": fetch_tabs_from_db(team_id=team_id),
    }
