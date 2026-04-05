from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import (
    create_tab_in_db,
    delete_tab_in_db,
    fetch_tabs_from_db,
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
      raise HTTPException(
          status_code=400,
          detail="Der Tab-Name darf nicht leer sein."
      )

    if len(normalized) > 100:
      raise HTTPException(
          status_code=400,
          detail="Der Tab-Name ist zu lang."
      )

    return normalized


@router.get("/")
def get_tabs():
    return fetch_tabs_from_db()


@router.post("/")
def create_tab(payload: TabCreateRequest):
    normalized_name = validate_tab_name(payload.name)

    try:
        created_tab = create_tab_in_db(normalized_name)
    except Exception as error:
        error_message = str(error).lower()

        if "unique" in error_message or "duplicate" in error_message:
            raise HTTPException(
                status_code=400,
                detail="Ein Tab mit diesem Namen existiert bereits."
            )

        raise

    return {
        "message": "Tab wurde angelegt.",
        "tab": created_tab,
        "tabs": fetch_tabs_from_db(),
    }


@router.patch("/{tab_id}")
def update_tab(tab_id: int, payload: TabUpdateRequest):
    normalized_name = validate_tab_name(payload.name)

    try:
        updated_tab = update_tab_in_db(tab_id, normalized_name)
    except Exception as error:
        error_message = str(error).lower()

        if "unique" in error_message or "duplicate" in error_message:
            raise HTTPException(
                status_code=400,
                detail="Ein Tab mit diesem Namen existiert bereits."
            )

        raise

    if not updated_tab:
        raise HTTPException(
            status_code=404,
            detail="Tab wurde nicht gefunden."
        )

    return {
        "message": "Tab wurde aktualisiert.",
        "tab": updated_tab,
        "tabs": fetch_tabs_from_db(),
    }


@router.delete("/{tab_id}")
def delete_tab(tab_id: int):
    existing_tabs = fetch_tabs_from_db()

    if len(existing_tabs) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Der letzte verbleibende Tab kann nicht gelöscht werden."
        )

    existing_tab = None
    for tab in existing_tabs:
        if tab["id"] == tab_id:
            existing_tab = tab
            break

    if not existing_tab:
        raise HTTPException(
            status_code=404,
            detail="Tab wurde nicht gefunden."
        )

    removed_count = delete_tab_in_db(tab_id)

    if removed_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Tab wurde nicht gefunden."
        )

    return {
        "message": "Tab wurde gelöscht.",
        "tabs": fetch_tabs_from_db(),
    }