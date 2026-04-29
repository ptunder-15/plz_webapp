from contextlib import asynccontextmanager
from typing import Optional
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.assignments import router as assignments_router
from api.auth import get_current_user
from api.auth_routes import router as auth_router
from api.groups import router as groups_router
from api.markers import router as markers_router
from api.tab_members import router as tab_members_router
from api.tabs import router as tabs_router
from api.teams import router as teams_router
from database import (
    check_database_connection,
    fetch_assignments_from_db,
    fetch_groups_from_db,
    fetch_tabs_from_db,
    get_teams_for_user_in_db,
    seed_default_data,
)

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_default_data()
    yield


app = FastAPI(title="PLZ Web App API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.standard-grid.com",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(markers_router)
app.include_router(groups_router)
app.include_router(assignments_router)
app.include_router(tabs_router)
app.include_router(tab_members_router)
app.include_router(teams_router)


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


@app.get("/db/teams")
def db_teams(user_email: str = Depends(get_current_user)):
    return get_teams_for_user_in_db(user_email)


@app.get("/db/tabs")
def db_tabs(user_email: str = Depends(get_current_user)):
    return fetch_tabs_from_db(user_email=user_email)


@app.get("/db/groups")
def db_groups(tab_id: Optional[int] = None, user_email: str = Depends(get_current_user)):
    return fetch_groups_from_db(tab_id=tab_id, user_email=user_email)


@app.get("/db/assignments")
def db_assignments(tab_id: Optional[int] = None, user_email: str = Depends(get_current_user)):
    return fetch_assignments_from_db(tab_id=tab_id, user_email=user_email)
