"""migrate tabs and postcode_values to team_id

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. team_id Spalten hinzufügen (nullable für die Datenmigration)
    op.add_column("tabs", sa.Column("team_id", sa.Integer(), nullable=True))
    op.add_column("postcode_values", sa.Column("team_id", sa.Integer(), nullable=True))

    # 2. Für jede eindeutige user_email in tabs ein Team erstellen
    user_emails = [
        row[0]
        for row in bind.execute(
            text("SELECT DISTINCT user_email FROM tabs")
        ).fetchall()
    ]

    for email in user_emails:
        team_id = bind.execute(
            text("INSERT INTO teams (name) VALUES ('Mein Team') RETURNING id")
        ).scalar()

        bind.execute(
            text(
                "INSERT INTO team_members (team_id, user_email, role) "
                "VALUES (:team_id, :email, 'admin')"
            ),
            {"team_id": team_id, "email": email},
        )

        bind.execute(
            text("UPDATE tabs SET team_id = :team_id WHERE user_email = :email"),
            {"team_id": team_id, "email": email},
        )

        bind.execute(
            text(
                "UPDATE postcode_values SET team_id = :team_id WHERE user_email = :email"
            ),
            {"team_id": team_id, "email": email},
        )

    # 3. user_email aus tabs entfernen, team_id auf NOT NULL setzen + FK hinzufügen
    op.alter_column("tabs", "team_id", nullable=False)
    op.create_foreign_key(
        "tabs_team_id_fkey", "tabs", "teams", ["team_id"], ["id"], ondelete="CASCADE"
    )
    op.drop_column("tabs", "user_email")

    # 4. postcode_values Primary Key neu aufbauen: (user_email, postcode) → (team_id, postcode)
    op.drop_constraint("postcode_values_pkey", "postcode_values", type_="primary")
    op.drop_column("postcode_values", "user_email")

    # Zeilen ohne team_id (falls postcode_values user_emails hatte die nicht in tabs waren)
    bind.execute(text("DELETE FROM postcode_values WHERE team_id IS NULL"))

    op.alter_column("postcode_values", "team_id", nullable=False)
    op.create_foreign_key(
        "postcode_values_team_id_fkey",
        "postcode_values",
        "teams",
        ["team_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_primary_key(
        "postcode_values_pkey", "postcode_values", ["team_id", "postcode"]
    )


def downgrade() -> None:
    # Vereinfachtes Downgrade: Spalten zurückbauen ohne Datenmigration
    op.drop_constraint("postcode_values_pkey", "postcode_values", type_="primary")
    op.drop_constraint("postcode_values_team_id_fkey", "postcode_values", type_="foreignkey")
    op.drop_column("postcode_values", "team_id")
    op.add_column("postcode_values", sa.Column("user_email", sa.String(255), nullable=False, server_default="lokal@entwickler.de"))
    op.create_primary_key("postcode_values_pkey", "postcode_values", ["user_email", "postcode"])

    op.drop_constraint("tabs_team_id_fkey", "tabs", type_="foreignkey")
    op.add_column("tabs", sa.Column("user_email", sa.String(255), nullable=False, server_default="lokal@entwickler.de"))
    op.drop_column("tabs", "team_id")
