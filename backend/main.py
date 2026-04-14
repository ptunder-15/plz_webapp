from typing import Optional
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.assignments import router as assignments_router
from api.groups import router as groups_router
from api.markers import router as markers_router
from api.tabs import router as tabs_router
from database import (
    check_database_connection,
    fetch_assignments_from_db,
    fetch_groups_from_db,
    fetch_tabs_from_db,
    initialize_database,
)

load_dotenv()

app = FastAPI(title="PLZ Web App API")

# --- SCHRITT 1 FIX: DIE CORS EINSTELLUNGEN ---
# Hier listen wir explizit auf, welche Domains zugreifen dürfen.
# Weil 'allow_credentials=True' gesetzt ist, darf hier niemals ein "*" vorkommen!
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.standard-grid.com",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(markers_router)
app.include_router(groups_router)
app.include_router(assignments_router)
app.include_router(tabs_router)


@app.on_event("startup")
def on_startup():
    initialize_database()


@app.get("/")
def read_root():
    return {"message": "Backend läuft"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/db/health")
def db_health_check():
    try:
        result = check_database_connection()
        return {"status": "ok", "database": "connected", "result": result}
    except Exception as error:
        return {
            "status": "error",
            "database": "disconnected",
            "detail": str(error),
        }


@app.get("/db/tabs")
def db_tabs():
    return fetch_tabs_from_db()


@app.get("/db/groups")
def db_groups(tab_id: Optional[int] = None):
    return fetch_groups_from_db(tab_id=tab_id)


@app.get("/db/assignments")
def db_assignments(tab_id: Optional[int] = None):
    return fetch_assignments_from_db(tab_id=tab_id)