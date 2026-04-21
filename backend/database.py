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


def seed_default_data():
    """Legt Standard-Tab und Standard-Gruppen an, falls die DB frisch und leer ist."""
    with engine.begin() as connection:
        existing_tabs_count = connection.execute(
            text("SELECT COUNT(*) FROM tabs")
        ).scalar()

        if existing_tabs_count > 0:
            return

        connection.execute(
            text("""
                INSERT INTO tabs (name, sort_order, user_email)
                VALUES ('Heizöl', 1, 'lokal@entwickler.de')
            """)
        )

        default_tab_id = connection.execute(
            text("SELECT id FROM tabs ORDER BY sort_order, id LIMIT 1")
        ).scalar()

        connection.execute(
            text("""
                INSERT INTO groups (tab_id, name, color, value)
                VALUES
                    (:tab_id, 'Gruppe A', '#2563eb', NULL),
                    (:tab_id, 'Gruppe B', '#dc2626', NULL),
                    (:tab_id, 'Gruppe C', '#16a34a', NULL)
            """),
            {"tab_id": default_tab_id},
        )


def fetch_tabs_from_db(user_email: Optional[str] = None):
    # WICHTIG: engine.begin() statt connect(), damit wir hier auch schreiben dürfen
    with engine.begin() as connection:
        query_str = "SELECT id, name, sort_order, user_email FROM tabs"
        params = {}

        if user_email:
            query_str += " WHERE user_email = :user_email"
            params["user_email"] = user_email
            
        query_str += " ORDER BY sort_order, id"
        
        result = connection.execute(text(query_str), params)
        rows = result.mappings().all()

        # NEU: Wenn der Nutzer noch gar keinen Tab hat, erstellen wir "Heizöl" automatisch
        if len(rows) == 0 and user_email:
            connection.execute(
                text("""
                    INSERT INTO tabs (name, sort_order, user_email)
                    VALUES ('Heizöl', 1, :user_email)
                """),
                {"user_email": user_email}
            )
            # Lade die Tabs direkt nochmal, damit der neue Tab ans Frontend geschickt wird
            result = connection.execute(text(query_str), params)
            rows = result.mappings().all()

        return [dict(row) for row in rows]


def create_tab_in_db(name: str, user_email: str = "lokal@entwickler.de"):
    with engine.begin() as connection:
        next_sort_order = connection.execute(
            text("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM tabs WHERE user_email = :user_email"),
            {"user_email": user_email}
        ).scalar()

        result = connection.execute(
            text("""
                INSERT INTO tabs (name, sort_order, user_email)
                VALUES (:name, :sort_order, :user_email)
                RETURNING id, name, sort_order, user_email
            """),
            {
                "name": name,
                "sort_order": next_sort_order,
                "user_email": user_email
            },
        )

        row = result.mappings().first()
        return dict(row)


def update_tab_in_db(tab_id: int, name: str, user_email: Optional[str] = None):
    with engine.begin() as connection:
        query_str = "UPDATE tabs SET name = :name WHERE id = :tab_id"
        params = {"tab_id": tab_id, "name": name}
        
        if user_email:
            query_str += " AND user_email = :user_email"
            params["user_email"] = user_email
            
        query_str += " RETURNING id, name, sort_order, user_email"
        
        result = connection.execute(text(query_str), params)
        row = result.mappings().first()

        if not row:
            return None

        return dict(row)


def delete_tab_in_db(tab_id: int, user_email: Optional[str] = None):
    with engine.begin() as connection:
        query_str = "DELETE FROM tabs WHERE id = :tab_id"
        params = {"tab_id": tab_id}
        
        if user_email:
            query_str += " AND user_email = :user_email"
            params["user_email"] = user_email

        result = connection.execute(text(query_str), params)
        return result.rowcount or 0


def fetch_groups_from_db(tab_id: Optional[int] = None, user_email: Optional[str] = None):
    with engine.connect() as connection:
        query_str = "SELECT g.id, g.tab_id, g.name, g.color, g.value FROM groups g"
        params = {}
        filters = []

        if user_email:
            query_str += " JOIN tabs t ON t.id = g.tab_id"
            filters.append("t.user_email = :user_email")
            params["user_email"] = user_email
            
        if tab_id is not None:
            filters.append("g.tab_id = :tab_id")
            params["tab_id"] = tab_id
            
        if filters:
            query_str += " WHERE " + " AND ".join(filters)
            
        query_str += " ORDER BY g.id"

        result = connection.execute(text(query_str), params)
        rows = result.mappings().all()

        output = []
        for row in rows:
            output.append({
                "id": row["id"],
                "tab_id": row["tab_id"],
                "name": row["name"],
                "color": row["color"],
                "value": float(row["value"]) if row["value"] is not None else None,
            })
        return output


def create_group_in_db(tab_id: int, name: str, color: str, value: Optional[float]):
    with engine.begin() as connection:
        result = connection.execute(
            text("""
                INSERT INTO groups (tab_id, name, color, value)
                VALUES (:tab_id, :name, :color, :value)
                RETURNING id, tab_id, name, color, value
            """),
            {
                "tab_id": tab_id,
                "name": name,
                "color": color,
                "value": value,
            },
        )
        row = result.mappings().first()
        return {
            "id": row["id"],
            "tab_id": row["tab_id"],
            "name": row["name"],
            "color": row["color"],
            "value": float(row["value"]) if row["value"] is not None else None,
        }


def update_group_in_db(group_id: int, name: str, color: str, value: Optional[float]):
    with engine.begin() as connection:
        result = connection.execute(
            text("""
                UPDATE groups
                SET name = :name,
                    color = :color,
                    value = :value
                WHERE id = :group_id
                RETURNING id, tab_id, name, color, value
            """),
            {
                "group_id": group_id,
                "name": name,
                "color": color,
                "value": value,
            },
        )
        row = result.mappings().first()
        if not row:
            return None
        return {
            "id": row["id"],
            "tab_id": row["tab_id"],
            "name": row["name"],
            "color": row["color"],
            "value": float(row["value"]) if row["value"] is not None else None,
        }


def delete_group_in_db(group_id: int):
    with engine.begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM groups
                WHERE id = :group_id
            """),
            {"group_id": group_id},
        )
        return result.rowcount or 0


def fetch_assignments_from_db(tab_id: Optional[int] = None, user_email: Optional[str] = None):
    with engine.connect() as connection:
        query_str = "SELECT a.tab_id, a.postcode, a.group_id FROM postcode_assignments a"
        params = {}
        filters = []

        if user_email:
            query_str += " JOIN tabs t ON t.id = a.tab_id"
            filters.append("t.user_email = :user_email")
            params["user_email"] = user_email
            
        if tab_id is not None:
            filters.append("a.tab_id = :tab_id")
            params["tab_id"] = tab_id
            
        if filters:
            query_str += " WHERE " + " AND ".join(filters)
            
        query_str += " ORDER BY a.tab_id, a.postcode"

        result = connection.execute(text(query_str), params)
        rows = result.mappings().all()
        return [dict(row) for row in rows]


def fetch_assignments_export_rows_from_db(tab_id: Optional[int] = None, user_email: Optional[str] = None):
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
        params = {}
        filters = []

        if user_email:
            filters.append("t.user_email = :user_email")
            params["user_email"] = user_email
            
        if tab_id is not None:
            filters.append("pa.tab_id = :tab_id")
            params["tab_id"] = tab_id
            
        if filters:
            query_str += " WHERE " + " AND ".join(filters)
            
        query_str += " ORDER BY pa.tab_id, pa.postcode"

        result = connection.execute(text(query_str), params)
        rows = result.mappings().all()

        output = []
        for row in rows:
            output.append({
                "tab_id": row["tab_id"],
                "tab_name": row["tab_name"],
                "postcode": row["postcode"],
                "group_id": row["group_id"],
                "group_name": row["group_name"],
                "group_color": row["group_color"],
                "group_value": float(row["group_value"]) if row["group_value"] is not None else None,
            })
        return output


def fetch_postcode_values_from_db(user_email: Optional[str] = None):
    with engine.connect() as connection:
        query_str = "SELECT postcode, value FROM postcode_values"
        params: dict = {}

        if user_email:
            query_str += " WHERE user_email = :user_email"
            params["user_email"] = user_email

        query_str += " ORDER BY postcode"

        result = connection.execute(text(query_str), params)
        rows = result.mappings().all()

        return [{"postcode": row["postcode"], "value": float(row["value"])} for row in rows]


def upsert_assignments_in_db(tab_id: int, group_id: int, postcodes: List[str]):
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


def delete_assignments_in_db(tab_id: int, postcodes: List[str]):
    if not postcodes:
        return 0

    placeholders = []
    parameters = {"tab_id": tab_id}

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
        result = connection.execute(query, parameters)
        return result.rowcount or 0


def upsert_postcode_values_in_db(rows: List[dict], user_email: str):
    if not rows:
        return

    placeholders = []
    params: dict = {"user_email": user_email}
    for i, row in enumerate(rows):
        placeholders.append(f"(:user_email, :postcode_{i}, :value_{i})")
        params[f"postcode_{i}"] = row["postcode"]
        params[f"value_{i}"] = row["value"]

    query = text(f"""
        INSERT INTO postcode_values (user_email, postcode, value)
        VALUES {", ".join(placeholders)}
        ON CONFLICT (user_email, postcode)
        DO UPDATE SET value = EXCLUDED.value
    """)

    with engine.begin() as connection:
        connection.execute(query, params)


def delete_postcode_values_in_db(postcodes: List[str], user_email: str):
    if not postcodes:
        return 0

    placeholders = []
    parameters: dict = {"user_email": user_email}

    for index, postcode in enumerate(postcodes):
        key = f"postcode_{index}"
        placeholders.append(f":{key}")
        parameters[key] = postcode

    query = text(f"""
        DELETE FROM postcode_values
        WHERE user_email = :user_email
          AND postcode IN ({", ".join(placeholders)})
    """)

    with engine.begin() as connection:
        result = connection.execute(query, parameters)
        return result.rowcount or 0