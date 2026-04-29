from typing import List, Optional
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://plzuser:plzpassword@localhost:5432/plzapp",
)

engine = create_engine(DATABASE_URL, future=True)


def check_database_connection():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return result.scalar()


DEV_EMAIL = "admin@standard-grid.com"


def seed_default_data():
    """Legt Testdaten an, falls die DB komplett frisch ist (nur Entwicklung)."""
    with engine.begin() as connection:
        team_count = connection.execute(text("SELECT COUNT(*) FROM teams")).scalar()
        if team_count > 0:
            return

        team_id = connection.execute(
            text("INSERT INTO teams (name) VALUES ('Mein Team') RETURNING id")
        ).scalar()

        connection.execute(
            text(
                "INSERT INTO team_members (team_id, user_email, role) "
                "VALUES (:team_id, 'lokal@entwickler.de', 'admin')"
            ),
            {"team_id": team_id},
        )

        tab_id = connection.execute(
            text(
                "INSERT INTO tabs (name, sort_order, team_id) "
                "VALUES ('Heizöl', 1, :team_id) RETURNING id"
            ),
            {"team_id": team_id},
        ).scalar()

        connection.execute(
            text("""
                INSERT INTO groups (tab_id, name, color, value)
                VALUES
                    (:tab_id, 'Gruppe A', '#2563eb', NULL),
                    (:tab_id, 'Gruppe B', '#dc2626', NULL),
                    (:tab_id, 'Gruppe C', '#16a34a', NULL)
            """),
            {"tab_id": tab_id},
        )


# ── Teams ─────────────────────────────────────────────────────────────────────

def get_user_role_in_team(team_id: int, user_email: str) -> Optional[str]:
    with engine.connect() as connection:
        return connection.execute(
            text(
                "SELECT role FROM team_members "
                "WHERE team_id = :team_id AND user_email = :user_email"
            ),
            {"team_id": team_id, "user_email": user_email},
        ).scalar()


def get_teams_for_user_in_db(user_email: str) -> list:
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    t.id,
                    t.name,
                    tm.role,
                    t.created_at,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
                FROM teams t
                JOIN team_members tm ON tm.team_id = t.id
                WHERE tm.user_email = :user_email
                ORDER BY t.created_at, t.id
            """),
            {"user_email": user_email},
        )
        return [dict(row) for row in result.mappings().all()]


def create_team_in_db(name: str, owner_email: str) -> dict:
    with engine.begin() as connection:
        row = connection.execute(
            text("INSERT INTO teams (name) VALUES (:name) RETURNING id, name"),
            {"name": name},
        ).mappings().first()

        team_id = row["id"]

        connection.execute(
            text(
                "INSERT INTO team_members (team_id, user_email, role) "
                "VALUES (:team_id, :email, 'admin')"
            ),
            {"team_id": team_id, "email": owner_email},
        )

        tab_id = connection.execute(
            text(
                "INSERT INTO tabs (name, sort_order, team_id) "
                "VALUES ('Heizöl', 1, :team_id) RETURNING id"
            ),
            {"team_id": team_id},
        ).scalar()

        connection.execute(
            text("""
                INSERT INTO groups (tab_id, name, color, value)
                VALUES
                    (:tab_id, 'Gruppe A', '#2563eb', NULL),
                    (:tab_id, 'Gruppe B', '#dc2626', NULL),
                    (:tab_id, 'Gruppe C', '#16a34a', NULL)
            """),
            {"tab_id": tab_id},
        )

        return {"id": team_id, "name": row["name"], "role": "admin", "member_count": 1}


def rename_team_in_db(team_id: int, name: str) -> Optional[dict]:
    with engine.begin() as connection:
        row = connection.execute(
            text("UPDATE teams SET name = :name WHERE id = :team_id RETURNING id, name"),
            {"team_id": team_id, "name": name},
        ).mappings().first()
        return dict(row) if row else None


def get_team_members_in_db(team_id: int) -> list:
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT user_email, role, invited_by, joined_at
                FROM team_members
                WHERE team_id = :team_id
                ORDER BY
                    CASE role WHEN 'admin' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END,
                    joined_at
            """),
            {"team_id": team_id},
        )
        return [dict(row) for row in result.mappings().all()]


def add_team_member_in_db(
    team_id: int, user_email: str, role: str, invited_by: str
) -> None:
    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO team_members (team_id, user_email, role, invited_by)
                VALUES (:team_id, :user_email, :role, :invited_by)
                ON CONFLICT (team_id, user_email) DO UPDATE SET role = EXCLUDED.role
            """),
            {
                "team_id": team_id,
                "user_email": user_email,
                "role": role,
                "invited_by": invited_by,
            },
        )


def update_team_member_role_in_db(
    team_id: int, user_email: str, role: str
) -> Optional[dict]:
    with engine.begin() as connection:
        row = connection.execute(
            text("""
                UPDATE team_members SET role = :role
                WHERE team_id = :team_id AND user_email = :user_email
                RETURNING user_email, role
            """),
            {"team_id": team_id, "user_email": user_email, "role": role},
        ).mappings().first()
        return dict(row) if row else None


def remove_team_member_in_db(team_id: int, user_email: str) -> int:
    with engine.begin() as connection:
        result = connection.execute(
            text(
                "DELETE FROM team_members "
                "WHERE team_id = :team_id AND user_email = :user_email"
            ),
            {"team_id": team_id, "user_email": user_email},
        )
        return result.rowcount


def get_team_id_for_tab(tab_id: int) -> Optional[int]:
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT team_id FROM tabs WHERE id = :tab_id"),
            {"tab_id": tab_id},
        ).scalar()


# ── Tabs ──────────────────────────────────────────────────────────────────────

def fetch_tabs_from_db(team_id: Optional[int] = None, user_email: Optional[str] = None) -> list:
    with engine.begin() as connection:
        if team_id is not None:
            result = connection.execute(
                text(
                    "SELECT id, name, sort_order, team_id "
                    "FROM tabs WHERE team_id = :team_id ORDER BY sort_order, id"
                ),
                {"team_id": team_id},
            )
            return [dict(row) for row in result.mappings().all()]

        # Fallback: alle Tabs aller Teams des Nutzers (für Debug-Endpoints)
        if user_email:
            result = connection.execute(
                text("""
                    SELECT t.id, t.name, t.sort_order, t.team_id
                    FROM tabs t
                    JOIN team_members tm ON tm.team_id = t.team_id
                    WHERE tm.user_email = :user_email
                    ORDER BY t.sort_order, t.id
                """),
                {"user_email": user_email},
            )
            return [dict(row) for row in result.mappings().all()]

        return []


def create_tab_in_db(name: str, team_id: int) -> dict:
    with engine.begin() as connection:
        next_sort_order = connection.execute(
            text(
                "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM tabs "
                "WHERE team_id = :team_id"
            ),
            {"team_id": team_id},
        ).scalar()

        row = connection.execute(
            text("""
                INSERT INTO tabs (name, sort_order, team_id)
                VALUES (:name, :sort_order, :team_id)
                RETURNING id, name, sort_order, team_id
            """),
            {"name": name, "sort_order": next_sort_order, "team_id": team_id},
        ).mappings().first()
        return dict(row)


def update_tab_in_db(tab_id: int, name: str, team_id: Optional[int] = None) -> Optional[dict]:
    with engine.begin() as connection:
        query = "UPDATE tabs SET name = :name WHERE id = :tab_id"
        params: dict = {"tab_id": tab_id, "name": name}

        if team_id is not None:
            query += " AND team_id = :team_id"
            params["team_id"] = team_id

        query += " RETURNING id, name, sort_order, team_id"

        row = connection.execute(text(query), params).mappings().first()
        return dict(row) if row else None


def delete_tab_in_db(tab_id: int, team_id: Optional[int] = None) -> int:
    with engine.begin() as connection:
        query = "DELETE FROM tabs WHERE id = :tab_id"
        params: dict = {"tab_id": tab_id}

        if team_id is not None:
            query += " AND team_id = :team_id"
            params["team_id"] = team_id

        return connection.execute(text(query), params).rowcount or 0


# ── Groups ────────────────────────────────────────────────────────────────────

def fetch_groups_from_db(
    tab_id: Optional[int] = None, user_email: Optional[str] = None
) -> list:
    with engine.connect() as connection:
        query_str = "SELECT g.id, g.tab_id, g.name, g.color, g.value FROM groups g"
        params: dict = {}
        filters = []

        if user_email:
            query_str += " JOIN tabs t ON t.id = g.tab_id JOIN team_members tm ON tm.team_id = t.team_id"
            filters.append("tm.user_email = :user_email")
            params["user_email"] = user_email

        if tab_id is not None:
            filters.append("g.tab_id = :tab_id")
            params["tab_id"] = tab_id

        if filters:
            query_str += " WHERE " + " AND ".join(filters)

        query_str += " ORDER BY g.id"

        result = connection.execute(text(query_str), params)
        return [
            {
                "id": row["id"],
                "tab_id": row["tab_id"],
                "name": row["name"],
                "color": row["color"],
                "value": float(row["value"]) if row["value"] is not None else None,
            }
            for row in result.mappings().all()
        ]


def create_group_in_db(
    tab_id: int, name: str, color: str, value: Optional[float]
) -> dict:
    with engine.begin() as connection:
        row = connection.execute(
            text("""
                INSERT INTO groups (tab_id, name, color, value)
                VALUES (:tab_id, :name, :color, :value)
                RETURNING id, tab_id, name, color, value
            """),
            {"tab_id": tab_id, "name": name, "color": color, "value": value},
        ).mappings().first()
        return {
            "id": row["id"],
            "tab_id": row["tab_id"],
            "name": row["name"],
            "color": row["color"],
            "value": float(row["value"]) if row["value"] is not None else None,
        }


def update_group_in_db(
    group_id: int, name: str, color: str, value: Optional[float]
) -> Optional[dict]:
    with engine.begin() as connection:
        row = connection.execute(
            text("""
                UPDATE groups
                SET name = :name, color = :color, value = :value
                WHERE id = :group_id
                RETURNING id, tab_id, name, color, value
            """),
            {"group_id": group_id, "name": name, "color": color, "value": value},
        ).mappings().first()
        if not row:
            return None
        return {
            "id": row["id"],
            "tab_id": row["tab_id"],
            "name": row["name"],
            "color": row["color"],
            "value": float(row["value"]) if row["value"] is not None else None,
        }


def delete_group_in_db(group_id: int) -> int:
    with engine.begin() as connection:
        return (
            connection.execute(
                text("DELETE FROM groups WHERE id = :group_id"),
                {"group_id": group_id},
            ).rowcount
            or 0
        )


# ── Assignments ───────────────────────────────────────────────────────────────

def fetch_assignments_from_db(
    tab_id: Optional[int] = None, user_email: Optional[str] = None
) -> list:
    with engine.connect() as connection:
        query_str = "SELECT a.tab_id, a.postcode, a.group_id FROM postcode_assignments a"
        params: dict = {}
        filters = []

        if user_email:
            query_str += " JOIN tabs t ON t.id = a.tab_id JOIN team_members tm ON tm.team_id = t.team_id"
            filters.append("tm.user_email = :user_email")
            params["user_email"] = user_email

        if tab_id is not None:
            filters.append("a.tab_id = :tab_id")
            params["tab_id"] = tab_id

        if filters:
            query_str += " WHERE " + " AND ".join(filters)

        query_str += " ORDER BY a.tab_id, a.postcode"

        result = connection.execute(text(query_str), params)
        return [dict(row) for row in result.mappings().all()]


def fetch_assignments_export_rows_from_db(
    tab_id: Optional[int] = None, user_email: Optional[str] = None
) -> list:
    with engine.connect() as connection:
        query_str = """
            SELECT
                pa.tab_id,
                t.name AS tab_name,
                pa.postcode,
                pa.group_id,
                g.name AS group_name,
                g.color AS group_color,
                g.value AS group_value
            FROM postcode_assignments pa
            JOIN groups g ON g.id = pa.group_id
            JOIN tabs t ON t.id = pa.tab_id
        """
        params: dict = {}
        filters = []

        if user_email:
            query_str += " JOIN team_members tm ON tm.team_id = t.team_id"
            filters.append("tm.user_email = :user_email")
            params["user_email"] = user_email

        if tab_id is not None:
            filters.append("pa.tab_id = :tab_id")
            params["tab_id"] = tab_id

        if filters:
            query_str += " WHERE " + " AND ".join(filters)

        query_str += " ORDER BY pa.tab_id, pa.postcode"

        result = connection.execute(text(query_str), params)
        return [
            {
                "tab_id": row["tab_id"],
                "tab_name": row["tab_name"],
                "postcode": row["postcode"],
                "group_id": row["group_id"],
                "group_name": row["group_name"],
                "group_color": row["group_color"],
                "group_value": float(row["group_value"]) if row["group_value"] is not None else None,
            }
            for row in result.mappings().all()
        ]


def upsert_assignments_in_db(tab_id: int, group_id: int, postcodes: List[str]) -> None:
    if not postcodes:
        return

    placeholders = []
    params: dict = {"tab_id": tab_id, "group_id": group_id}
    for i, postcode in enumerate(postcodes):
        placeholders.append(f"(:tab_id, :p{i}, :group_id)")
        params[f"p{i}"] = postcode

    query = text(f"""
        INSERT INTO postcode_assignments (tab_id, postcode, group_id)
        VALUES {", ".join(placeholders)}
        ON CONFLICT (tab_id, postcode)
        DO UPDATE SET group_id = EXCLUDED.group_id
    """)

    with engine.begin() as connection:
        connection.execute(query, params)


def delete_assignments_in_db(tab_id: int, postcodes: List[str]) -> int:
    if not postcodes:
        return 0

    placeholders = []
    parameters: dict = {"tab_id": tab_id}

    for index, postcode in enumerate(postcodes):
        key = f"postcode_{index}"
        placeholders.append(f":{key}")
        parameters[key] = postcode

    query = text(f"""
        DELETE FROM postcode_assignments
        WHERE tab_id = :tab_id
          AND postcode IN ({", ".join(placeholders)})
    """)

    with engine.begin() as connection:
        return connection.execute(query, parameters).rowcount or 0


# ── Postcode Values ───────────────────────────────────────────────────────────

def fetch_postcode_values_from_db(team_id: Optional[int] = None) -> list:
    with engine.connect() as connection:
        query_str = "SELECT postcode, value FROM postcode_values"
        params: dict = {}

        if team_id is not None:
            query_str += " WHERE team_id = :team_id"
            params["team_id"] = team_id

        query_str += " ORDER BY postcode"

        result = connection.execute(text(query_str), params)
        return [
            {"postcode": row["postcode"], "value": float(row["value"])}
            for row in result.mappings().all()
        ]


def upsert_postcode_values_in_db(rows: List[dict], team_id: int) -> None:
    if not rows:
        return

    placeholders = []
    params: dict = {"team_id": team_id}
    for i, row in enumerate(rows):
        placeholders.append(f"(:team_id, :postcode_{i}, :value_{i})")
        params[f"postcode_{i}"] = row["postcode"]
        params[f"value_{i}"] = row["value"]

    query = text(f"""
        INSERT INTO postcode_values (team_id, postcode, value)
        VALUES {", ".join(placeholders)}
        ON CONFLICT (team_id, postcode)
        DO UPDATE SET value = EXCLUDED.value
    """)

    with engine.begin() as connection:
        connection.execute(query, params)


def delete_postcode_values_in_db(postcodes: List[str], team_id: int) -> int:
    if not postcodes:
        return 0

    placeholders = []
    parameters: dict = {"team_id": team_id}

    for index, postcode in enumerate(postcodes):
        key = f"postcode_{index}"
        placeholders.append(f":{key}")
        parameters[key] = postcode

    query = text(f"""
        DELETE FROM postcode_values
        WHERE team_id = :team_id
          AND postcode IN ({", ".join(placeholders)})
    """)

    with engine.begin() as connection:
        return connection.execute(query, parameters).rowcount or 0


# ── Users ─────────────────────────────────────────────────────────────────────

def get_user_by_email(email: str) -> Optional[dict]:
    with engine.connect() as connection:
        row = connection.execute(
            text("SELECT id, email, password_hash, is_active FROM users WHERE email = :email"),
            {"email": email},
        ).mappings().first()
        return dict(row) if row else None


def create_user_in_db(email: str, password_hash: str) -> dict:
    with engine.begin() as connection:
        row = connection.execute(
            text(
                "INSERT INTO users (email, password_hash) "
                "VALUES (:email, :password_hash) RETURNING id, email, is_active"
            ),
            {"email": email, "password_hash": password_hash},
        ).mappings().first()
        return dict(row)


def count_users() -> int:
    with engine.connect() as connection:
        return connection.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0


def update_user_password_in_db(email: str, password_hash: str) -> None:
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE users SET password_hash = :hash WHERE email = :email"),
            {"hash": password_hash, "email": email},
        )


# ── Invite Tokens ─────────────────────────────────────────────────────────────

def create_invite_token_in_db(
    email: str,
    team_id: Optional[int],
    role: str,
    invited_by: str,
    token: str,
    expires_at,
) -> None:
    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO invite_tokens (token, email, team_id, role, invited_by, expires_at)
                VALUES (:token, :email, :team_id, :role, :invited_by, :expires_at)
                ON CONFLICT (token) DO NOTHING
            """),
            {
                "token": token,
                "email": email,
                "team_id": team_id,
                "role": role,
                "invited_by": invited_by,
                "expires_at": expires_at,
            },
        )


def get_invite_token_in_db(token: str) -> Optional[dict]:
    with engine.connect() as connection:
        row = connection.execute(
            text("""
                SELECT id, token, email, team_id, role, invited_by, expires_at, used_at
                FROM invite_tokens
                WHERE token = :token
            """),
            {"token": token},
        ).mappings().first()
        return dict(row) if row else None


def use_invite_token_in_db(token_id: int) -> None:
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE invite_tokens SET used_at = NOW() WHERE id = :id"),
            {"id": token_id},
        )


# ── Password Reset Tokens ─────────────────────────────────────────────────────

def create_password_reset_token_in_db(email: str, token: str, expires_at) -> None:
    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO password_reset_tokens (token, email, expires_at)
                VALUES (:token, :email, :expires_at)
            """),
            {"token": token, "email": email, "expires_at": expires_at},
        )


def get_password_reset_token_in_db(token: str) -> Optional[dict]:
    with engine.connect() as connection:
        row = connection.execute(
            text("""
                SELECT id, token, email, expires_at, used_at
                FROM password_reset_tokens
                WHERE token = :token
            """),
            {"token": token},
        ).mappings().first()
        return dict(row) if row else None


def use_password_reset_token_in_db(token_id: int) -> None:
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = :id"),
            {"id": token_id},
        )
