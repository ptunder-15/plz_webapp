from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

# NEU: Wir importieren unseren Türsteher aus der auth.py im gleichen Ordner
from .auth import get_current_user

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
def get_tabs(user_email: str = Depends(get_current_user)):
    # Gibt nur die Tabs des aktuell eingeloggten Nutzers zurück
    return fetch_tabs_from_db(user_email=user_email)


@router.post("/")
def create_tab(payload: TabCreateRequest, user_email: str = Depends(get_current_user)):
    normalized_name = validate_tab_name(payload.name)

    try:
        # Reicht die E-Mail an die Datenbank weiter
        created_tab = create_tab_in_db(normalized_name, user_email=user_email)
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
        "tabs": fetch_tabs_from_db(user_email=user_email),
    }


@router.patch("/{tab_id}")
def update_tab(tab_id: int, payload: TabUpdateRequest, user_email: str = Depends(get_current_user)):
    normalized_name = validate_tab_name(payload.name)

    try:
        # Aktualisiert nur, wenn der Tab auch diesem Nutzer gehört
        updated_tab = update_tab_in_db(tab_id, normalized_name, user_email=user_email)
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
            detail="Tab wurde nicht gefunden oder gehört dir nicht."
        )

    return {
        "message": "Tab wurde aktualisiert.",
        "tab": updated_tab,
        "tabs": fetch_tabs_from_db(user_email=user_email),
    }


@router.delete("/{tab_id}")
def delete_tab(tab_id: int, user_email: str = Depends(get_current_user)):
    # Holt nur die Tabs DIESES Nutzers, um zu prüfen, ob es sein letzter ist
    existing_tabs = fetch_tabs_from_db(user_email=user_email)

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
            detail="Tab wurde nicht gefunden oder gehört dir nicht."
        )

    # Löscht den Tab unter Berücksichtigung der E-Mail
    removed_count = delete_tab_in_db(tab_id, user_email=user_email)

    if removed_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Tab wurde nicht gefunden."
        )

    return {
        "message": "Tab wurde gelöscht.",
        "tabs": fetch_tabs_from_db(user_email=user_email),
    }