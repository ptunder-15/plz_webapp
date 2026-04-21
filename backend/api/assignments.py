import csv
import io
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# NEU: Unser Türsteher
from .auth import get_current_user

from database import (
    delete_assignments_in_db,
    fetch_assignments_export_rows_from_db,
    fetch_assignments_from_db,
    fetch_groups_from_db,
    fetch_postcode_values_from_db,
    fetch_tabs_from_db,  # NEU: Importiert, um Tab-Besitz zu prüfen
    upsert_assignments_in_db,
    upsert_postcode_values_in_db,
)

router = APIRouter(prefix="/assignments", tags=["assignments"])


class AssignmentCreateRequest(BaseModel):
    tab_id: int
    group_id: int
    postcodes: List[str]


class AssignmentDeleteRequest(BaseModel):
    tab_id: int
    postcodes: List[str]


class PostcodeValuesBulkCreateRequest(BaseModel):
    value: float
    postcodes: List[str]


def normalize_postcodes(postcodes: List[str]) -> List[str]:
    cleaned = []
    seen = set()

    for postcode in postcodes:
        normalized = str(postcode).strip()

        if not normalized:
            continue

        if not normalized.isdigit() or len(normalized) != 5:
            continue

        if normalized not in seen:
            seen.add(normalized)
            cleaned.append(normalized)

    return cleaned


# NEU: Hilfsfunktion, um zu prüfen, ob der Tab dem Nutzer gehört
def verify_tab_ownership(tab_id: int, user_email: str):
    user_tabs = fetch_tabs_from_db(user_email=user_email)
    if not any(t["id"] == tab_id for t in user_tabs):
        raise HTTPException(
            status_code=404,
            detail="Tab wurde nicht gefunden oder gehört dir nicht."
        )


@router.get("/")
def get_assignments(
    tab_id: Optional[int] = Query(default=None),
    user_email: str = Depends(get_current_user)
):
    return fetch_assignments_from_db(tab_id=tab_id, user_email=user_email)


@router.get("/export")
def export_assignments_csv(
    tab_id: Optional[int] = Query(default=None),
    user_email: str = Depends(get_current_user)
):
    if tab_id is not None:
        verify_tab_ownership(tab_id, user_email)

    rows = fetch_assignments_export_rows_from_db(tab_id=tab_id, user_email=user_email)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "tab_id",
        "tab_name",
        "postcode",
        "group_id",
        "group_name",
        "group_color",
        "group_value",
    ])

    for row in rows:
        writer.writerow([
            row["tab_id"],
            row["tab_name"],
            row["postcode"],
            row["group_id"],
            row["group_name"],
            row["group_color"],
            row["group_value"],
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="assignments_export.csv"'
        },
    )


@router.get("/values")
def get_postcode_values(user_email: str = Depends(get_current_user)):
    return fetch_postcode_values_from_db(user_email=user_email)


@router.post("/values/bulk")
def create_postcode_values(
    payload: PostcodeValuesBulkCreateRequest,
    user_email: str = Depends(get_current_user)
):
    normalized_postcodes = normalize_postcodes(payload.postcodes)

    if not normalized_postcodes:
        raise HTTPException(
            status_code=400,
            detail="Keine gültigen fünfstelligen PLZ übergeben."
        )

    rows_to_upsert = [{"postcode": p, "value": payload.value} for p in normalized_postcodes]
    upsert_postcode_values_in_db(rows_to_upsert, user_email=user_email)

    return {
        "message": f"{len(normalized_postcodes)} PLZ-Werte wurden gespeichert.",
        "values": fetch_postcode_values_from_db(user_email=user_email),
    }


@router.post("/import")
async def import_assignments_csv(
    file: UploadFile = File(...),
    tab_id: int = Query(...),
    user_email: str = Depends(get_current_user)
):
    # Gehört der Tab dem Nutzer?
    verify_tab_ownership(tab_id, user_email)

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Bitte eine CSV-Datei hochladen."
        )

    content = await file.read()

    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="CSV konnte nicht als UTF-8 gelesen werden."
        )

    reader = csv.DictReader(io.StringIO(decoded))

    required_columns = {"postcode", "group_id"}
    if not reader.fieldnames or not required_columns.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=400,
            detail="CSV muss die Spalten 'postcode' und 'group_id' enthalten."
        )

    # Lädt nur die Gruppen, die auch wirklich zu dem Nutzer gehören
    valid_group_ids = {group["id"] for group in fetch_groups_from_db(tab_id=tab_id, user_email=user_email)}

    imported_count = 0
    skipped_count = 0
    errors = []
    latest_group_by_postcode = {}

    for row_number, row in enumerate(reader, start=2):
        raw_postcode = str(row.get("postcode", "")).strip()
        raw_group_id = str(row.get("group_id", "")).strip()

        normalized_postcodes = normalize_postcodes([raw_postcode])
        if not normalized_postcodes:
            skipped_count += 1
            errors.append(f"Zeile {row_number}: ungültige PLZ '{raw_postcode}'.")
            continue

        try:
            group_id = int(raw_group_id)
        except ValueError:
            skipped_count += 1
            errors.append(f"Zeile {row_number}: ungültige group_id '{raw_group_id}'.")
            continue

        if group_id not in valid_group_ids:
            skipped_count += 1
            errors.append(
                f"Zeile {row_number}: group_id {group_id} existiert im Tab {tab_id} nicht oder gehört dir nicht."
            )
            continue

        latest_group_by_postcode[normalized_postcodes[0]] = group_id

    grouped_postcodes = {}
    for postcode, group_id in latest_group_by_postcode.items():
        grouped_postcodes.setdefault(group_id, []).append(postcode)

    for group_id, postcodes in grouped_postcodes.items():
        upsert_assignments_in_db(tab_id, group_id, postcodes)
        imported_count += len(postcodes)

    return {
        "message": f"{imported_count} Zuweisungen importiert, {skipped_count} übersprungen.",
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "errors": errors,
        "assignments": fetch_assignments_from_db(tab_id=tab_id, user_email=user_email),
    }


@router.post("/import-values")
async def import_postcode_values(
    file: UploadFile = File(...),
    user_email: str = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Bitte eine Datei hochladen."
        )

    content = await file.read()

    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Datei konnte nicht als UTF-8 gelesen werden."
        )

    reader = csv.reader(io.StringIO(decoded), delimiter=";")

    imported_count = 0
    skipped_count = 0
    errors = []
    rows_to_upsert = []
    latest_value_by_postcode = {}

    for row_number, row in enumerate(reader, start=1):
        if not row or len(row) < 2:
            skipped_count += 1
            errors.append(f"Zeile {row_number}: erwartet 'postcode;value'.")
            continue

        raw_postcode = str(row[0]).strip()
        raw_value = str(row[1]).strip()

        normalized_postcodes = normalize_postcodes([raw_postcode])
        if not normalized_postcodes:
            skipped_count += 1
            errors.append(f"Zeile {row_number}: ungültige PLZ '{raw_postcode}'.")
            continue

        normalized_value = raw_value.replace(",", ".")

        try:
            value = float(normalized_value)
        except ValueError:
            skipped_count += 1
            errors.append(f"Zeile {row_number}: ungültiger Wert '{raw_value}'.")
            continue

        latest_value_by_postcode[normalized_postcodes[0]] = value

    for postcode, value in latest_value_by_postcode.items():
        rows_to_upsert.append({
            "postcode": postcode,
            "value": value,
        })

    if rows_to_upsert:
        upsert_postcode_values_in_db(rows_to_upsert, user_email=user_email)
        imported_count = len(rows_to_upsert)

    return {
        "message": f"{imported_count} Werte importiert, {skipped_count} übersprungen.",
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "errors": errors,
        "values": fetch_postcode_values_from_db(user_email=user_email),
    }


@router.post("/bulk")
def create_assignments(
    payload: AssignmentCreateRequest,
    user_email: str = Depends(get_current_user)
):
    verify_tab_ownership(payload.tab_id, user_email)

    normalized_postcodes = normalize_postcodes(payload.postcodes)

    if not normalized_postcodes:
        raise HTTPException(
            status_code=400,
            detail="Keine gültigen fünfstelligen PLZ übergeben."
        )

    valid_group_ids = {group["id"] for group in fetch_groups_from_db(tab_id=payload.tab_id, user_email=user_email)}
    if payload.group_id not in valid_group_ids:
        raise HTTPException(
            status_code=400,
            detail="Die Gruppe gehört nicht zum angegebenen Tab oder gehört dir nicht."
        )

    upsert_assignments_in_db(payload.tab_id, payload.group_id, normalized_postcodes)

    return {
        "message": f"{len(normalized_postcodes)} PLZ wurden zugewiesen.",
        "assignments": fetch_assignments_from_db(tab_id=payload.tab_id, user_email=user_email),
    }


@router.delete("/bulk")
def delete_assignments(
    payload: AssignmentDeleteRequest,
    user_email: str = Depends(get_current_user)
):
    verify_tab_ownership(payload.tab_id, user_email)

    normalized_postcodes = normalize_postcodes(payload.postcodes)

    if not normalized_postcodes:
        raise HTTPException(
            status_code=400,
            detail="Keine gültigen fünfstelligen PLZ zum Entfernen übergeben."
        )

    removed_count = delete_assignments_in_db(payload.tab_id, normalized_postcodes)

    return {
        "message": f"{removed_count} Zuweisungen wurden entfernt.",
        "assignments": fetch_assignments_from_db(tab_id=payload.tab_id, user_email=user_email),
    }