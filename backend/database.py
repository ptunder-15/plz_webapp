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


def table_exists(connection, table_name: str) -> bool:
    return bool(connection.execute(text("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_name = :table_name
        )
    """), {"table_name": table_name}).scalar())


def get_table_columns(connection, table_name: str):
    return connection.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = :table_name
    """), {"table_name": table_name}).scalars().all()


def sync_serial_sequence(connection, table_name: str, id_column: str = "id"):
    connection.execute(text(f"""
        SELECT setval(
            pg_get_serial_sequence('{table_name}', '{id_column}'),
            COALESCE((SELECT MAX({id_column}) FROM {table_name}), 1),
            true
        )
    """))


def initialize_database():
    with engine.begin() as connection:
        # 1. TABS: Create table without UNIQUE constraint on name, add user_email
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS tabs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                user_email VARCHAR(255) NOT NULL DEFAULT 'lokal@entwickler.de'
            )
        """))

        # 2. TABS MIGRATION: Add user_email if missing and drop unique constraint
        tabs_columns = get_table_columns(connection, "tabs")
        if "user_email" not in tabs_columns:
            connection.execute(text("ALTER TABLE tabs ADD COLUMN user_email VARCHAR(255) NOT NULL DEFAULT 'lokal@entwickler.de'"))
            # We drop the unique constraint so multiple users can have a tab with the same name
            connection.execute(text("ALTER TABLE tabs DROP CONSTRAINT IF EXISTS tabs_name_key"))

        existing_tabs_count = connection.execute(
            text("SELECT COUNT(*) FROM tabs")
        ).scalar()

        if existing_tabs_count == 0:
            connection.execute(
                text("""
                    INSERT INTO tabs (name, sort_order, user_email)
                    VALUES ('Heizöl', 1, 'lokal@entwickler.de')
                """)
            )

        default_tab_id = connection.execute(
            text("SELECT id FROM tabs ORDER BY sort_order, id LIMIT 1")
        ).scalar()

        groups_exists = table_exists(connection, "groups")
        groups_new_exists = table_exists(connection, "groups_new")

        if not groups_exists and not groups_new_exists:
            connection.execute(text("""
                CREATE TABLE groups (
                    id SERIAL PRIMARY KEY,
                    tab_id INTEGER NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL,
                    color VARCHAR(20) NOT NULL,
                    value NUMERIC(10, 2) NULL
                )
            """))
        elif not groups_exists and groups_new_exists:
            connection.execute(text("ALTER TABLE groups_new RENAME TO groups"))
        elif groups_exists:
            group_columns = get_table_columns(connection, "groups")
            has_tab_id = "tab_id" in group_columns
            has_value = "value" in group_columns

            if not has_tab_id or not has_value:
                if not groups_new_exists:
                    connection.execute(text("""
                        CREATE TABLE groups_new (
                            id SERIAL PRIMARY KEY,
                            tab_id INTEGER NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
                            name VARCHAR(100) NOT NULL,
                            color VARCHAR(20) NOT NULL,
                            value NUMERIC(10, 2) NULL
                        )
                    """))

                existing_new_groups_count = connection.execute(
                    text("SELECT COUNT(*) FROM groups_new")
                ).scalar()

                if existing_new_groups_count == 0:
                    old_rows = connection.execute(text("""
                        SELECT id, name, color
                        FROM groups
                        ORDER BY id
                    """)).mappings().all()

                    for row in old_rows:
                        connection.execute(
                            text("""
                                INSERT INTO groups_new (id, tab_id, name, color, value)
                                VALUES (:id, :tab_id, :name, :color, :value)
                            """),
                            {
                                "id": row["id"],
                                "tab_id": default_tab_id,
                                "name": row["name"],
                                "color": row["color"],
                                "value": None,
                            },
                        )

                connection.execute(text("DROP TABLE groups"))
                connection.execute(text("ALTER TABLE groups_new RENAME TO groups"))

        groups_value_is_not_null = connection.execute(text("""
            SELECT is_nullable
            FROM information_schema.columns
            WHERE table_name = 'groups'
              AND column_name = 'value'
        """)).scalar()

        if groups_value_is_not_null == "NO":
            connection.execute(text("""
                ALTER TABLE groups
                ALTER COLUMN value DROP NOT NULL
            """))

        assignments_exists = table_exists(connection, "postcode_assignments")
        assignments_new_exists = table_exists(connection, "postcode_assignments_new")

        if not assignments_exists and not assignments_new_exists:
            connection.execute(text("""
                CREATE TABLE postcode_assignments (
                    tab_id INTEGER NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
                    postcode VARCHAR(5) NOT NULL,
                    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                    PRIMARY KEY (tab_id, postcode)
                )
            """))
        elif not assignments_exists and assignments_new_exists:
            connection.execute(text("ALTER TABLE postcode_assignments_new RENAME TO postcode_assignments"))
        elif assignments_exists:
            assignment_columns = get_table_columns(connection, "postcode_assignments")
            has_tab_id = "tab_id" in assignment_columns

            if not has_tab_id:
                if not assignments_new_exists:
                    connection.execute(text("""
                        CREATE TABLE postcode_assignments_new (
                            tab_id INTEGER NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
                            postcode VARCHAR(5) NOT NULL,
                            group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                            PRIMARY KEY (tab_id, postcode)
                        )
                    """))

                existing_new_assignments_count = connection.execute(
                    text("SELECT COUNT(*) FROM postcode_assignments_new")
                ).scalar()

                if existing_new_assignments_count == 0:
                    old_rows = connection.execute(text("""
                        SELECT postcode, group_id
                        FROM postcode_assignments
                        ORDER BY postcode
                    """)).mappings().all()

                    for row in old_rows:
                        connection.execute(
                            text("""
                                INSERT INTO postcode_assignments_new (tab_id, postcode, group_id)
                                VALUES (:tab_id, :postcode, :group_id)
                            """),
                            {
                                "tab_id": default_tab_id,
                                "postcode": row["postcode"],
                                "group_id": row["group_id"],
                            },
                        )

                connection.execute(text("DROP TABLE postcode_assignments"))
                connection.execute(text("ALTER TABLE postcode_assignments_new RENAME TO postcode_assignments"))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS postcode_values (
                postcode VARCHAR(5) PRIMARY KEY,
                value NUMERIC(10, 2) NOT NULL
            )
        """))

        existing_groups_count = connection.execute(
            text("SELECT COUNT(*) FROM groups")
        ).scalar()

        if existing_groups_count == 0:
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

        sync_serial_sequence(connection, "tabs")
        sync_serial_sequence(connection, "groups")


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


def fetch_postcode_values_from_db():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT postcode, value
                FROM postcode_values
                ORDER BY postcode
            """)
        )
        rows = result.mappings().all()

        output = []
        for row in rows:
            output.append({
                "postcode": row["postcode"],
                "value": float(row["value"]),
            })
        return output


def upsert_assignments_in_db(tab_id: int, group_id: int, postcodes: List[str]):
    with engine.begin() as connection:
        for postcode in postcodes:
            connection.execute(
                text("""
                    INSERT INTO postcode_assignments (tab_id, postcode, group_id)
                    VALUES (:tab_id, :postcode, :group_id)
                    ON CONFLICT (tab_id, postcode)
                    DO UPDATE SET group_id = EXCLUDED.group_id
                """),
                {
                    "tab_id": tab_id,
                    "postcode": postcode,
                    "group_id": group_id,
                },
            )


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


def upsert_postcode_values_in_db(rows: List[dict]):
    with engine.begin() as connection:
        for row in rows:
            connection.execute(
                text("""
                    INSERT INTO postcode_values (postcode, value)
                    VALUES (:postcode, :value)
                    ON CONFLICT (postcode)
                    DO UPDATE SET value = EXCLUDED.value
                """),
                {
                    "postcode": row["postcode"],
                    "value": row["value"],
                },
            )


def delete_postcode_values_in_db(postcodes: List[str]):
    if not postcodes:
        return 0

    placeholders = []
    parameters = {}

    for index, postcode in enumerate(postcodes):
        key = f"postcode_{index}"
        placeholders.append(f":{key}")
        parameters[key] = postcode

    query = text(f"""
        DELETE FROM postcode_values
        WHERE postcode IN ({", ".join(placeholders)})
    """)

    with engine.begin() as connection:
        result = connection.execute(query, parameters)
        return result.rowcount or 0